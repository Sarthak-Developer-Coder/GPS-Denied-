import seedrandom from "seedrandom";
import { resolvePhaseState, ScenarioPhase, JammingProfile } from "./scenarioStateMachine";
import { ERROR_CODES } from "./errorCodes";

export interface EngineScenario {
  key: string;
  durationSec: number;
  jammingProfile: JammingProfile;
  goalDefinition: { totalGoals: number; explorationTarget: boolean };
  scoringWeights: Record<string, number>;
}

export interface EngineStackVersion {
  submissionType: string;
  paramOverrides?: Record<string, unknown> | null;
  cmdVelType: string;
}

export interface SimTelemetryEvent {
  type: "telemetry";
  timestampSim: number;
  payload: {
    phase: ScenarioPhase;
    overallProgress: number;
    gpsRadiusMeters: number | null;
    pose: { x: number; y: number; yaw: number };
    tfValid: boolean;
    mapCoveragePct: number;
    goalsReached: number;
    goalsTotal: number;
    collisions: number;
    cmdVel: { linear: number; angular: number };
    score_hint: number;
  };
}

export interface SimLogEvent {
  type: "log";
  timestampSim: number;
  eventType: string;
  severity: "info" | "warning" | "critical";
  message: string;
  payload?: Record<string, unknown>;
}

export type SimEvent = SimTelemetryEvent | SimLogEvent;

export interface CategoryScores {
  localizationContinuity: number;
  slamMapQuality: number;
  gpsDenialTransition: number;
  navigationPerformance: number;
  explorationCompleteness: number;
  safety: number;
}

export interface SimulationResult {
  overallScore: number;
  passFail: boolean;
  categoryScores: CategoryScores;
  errorCodes: string[];
  stats: Record<string, number>;
}

const WALL_CLOCK_TARGET_SEC = 42; // demo pacing: every run "plays out" in ~42s regardless of sim duration

/** Inspects submitted parameters/manifest for the exact known misconfigurations from Spec §5. */
function detectMisconfigFlags(stackVersion: EngineStackVersion, rng: () => number) {
  const overrides = (stackVersion.paramOverrides ?? {}) as Record<string, unknown>;
  const flags = {
    rayTracingDisabled: overrides["Grid/RayTracing"] === false || overrides["Grid/RayTracing"] === "false",
    depthClampMissing:
      overrides["Vis/MaxDepth"] === undefined ||
      Number(overrides["Vis/MaxDepth"] ?? 0) > 20 ||
      Number(overrides["Vis/MaxDepth"] ?? 0) === 0,
    cmdVelMismatch: stackVersion.submissionType === "DOCKER_IMAGE" && rng() < 0.08,
    dualTfPublisher: stackVersion.submissionType === "DOCKER_IMAGE" && rng() < 0.05,
    containerFlaky: stackVersion.submissionType === "DOCKER_IMAGE" && rng() < 0.04,
  };
  return flags;
}

export class SimulationEngine {
  constructor(
    private readonly seed: number,
    private readonly scenario: EngineScenario,
    private readonly stackVersion: EngineStackVersion,
    private readonly onEvent: (evt: SimEvent) => void
  ) {}

  async execute(signal?: { cancelled: boolean }): Promise<SimulationResult> {
    const rng = seedrandom(String(this.seed));
    const flags = detectMisconfigFlags(this.stackVersion, rng);
    const errorCodes = new Set<string>();

    const tickMs = 350;
    const tickCount = Math.ceil((WALL_CLOCK_TARGET_SEC * 1000) / tickMs);
    const simDeltaPerTick = this.scenario.durationSec / tickCount;

    let simTime = 0;
    let tfValidTicks = 0;
    let totalTicks = 0;
    let mapCoveragePct = 0;
    let loopClosureCount = 0;
    let goalsReached = 0;
    const goalsTotal = this.scenario.goalDefinition.totalGoals;
    let collisions = 0;
    let pose = { x: 0, y: 0, yaw: 0 };
    let driftMeters = 0;
    let deniedOnsetSimTime: number | null = null;
    let recoverySimTime: number | null = null;
    let navStallDuringHybrid = false;
    let cmdVelViolations = 0;
    let lastPhase: ScenarioPhase = "GPS_AVAILABLE";
    let containerCrashed = false;
    let startupFailed = false;

    if (flags.containerFlaky && rng() < 0.5) {
      startupFailed = true;
      errorCodes.add("ERR_CONTAINER_STARTUP_FAILED");
      this.emitLog(0, "container_startup_failed", "critical", "Container failed health checks within startup_timeout_s");
      return this.finalize(errorCodes, {
        tfValidTicks: 0,
        totalTicks: 1,
        mapCoveragePct: 0,
        loopClosureCount: 0,
        goalsReached: 0,
        goalsTotal,
        collisions: 0,
        driftMeters: 999,
        recoverySec: 999,
        navStallDuringHybrid: 1,
        cmdVelViolations: 0,
        explorationPct: 0,
      });
    }

    if (flags.dualTfPublisher) {
      errorCodes.add("ERR_TF_DUAL_PUBLISHER");
    }
    if (flags.cmdVelMismatch) {
      errorCodes.add("ERR_CMDVEL_TYPE_MISMATCH");
    }
    if (flags.rayTracingDisabled) {
      errorCodes.add("ERR_GRID_RAYTRACING_DISABLED");
    }
    if (flags.depthClampMissing) {
      errorCodes.add("ERR_ODOM_DEPTH_CLAMP_MISSING");
    }

    for (let i = 0; i < tickCount; i++) {
      if (signal?.cancelled) {
        this.emitLog(simTime, "run_cancelled", "warning", "Run cancelled by user");
        break;
      }
      simTime += simDeltaPerTick;
      totalTicks++;
      const phaseState = resolvePhaseState(simTime, this.scenario.durationSec, this.scenario.jammingProfile);

      if (phaseState.phase !== lastPhase) {
        this.emitLog(simTime, "phase_transition", "info", `Scenario entered phase ${phaseState.phase}`, {
          phase: phaseState.phase,
        });
        if (phaseState.phase === "DENIED") deniedOnsetSimTime = simTime;
        lastPhase = phaseState.phase;
      }

      // TF validity: degrades if dual publisher, or briefly during denial onset (expected recovery window)
      let tfValid = true;
      if (flags.dualTfPublisher && rng() < 0.35) tfValid = false;
      if (phaseState.phase === "DENIED" && deniedOnsetSimTime !== null) {
        const sinceOnset = simTime - deniedOnsetSimTime;
        if (sinceOnset < 8 && rng() < 0.4) tfValid = false;
        if (sinceOnset >= 8 && recoverySimTime === null) recoverySimTime = simTime;
      }
      if (tfValid) tfValidTicks++;
      else if (rng() < 0.02) errorCodes.add("ERR_LOCALIZATION_LOST");

      // map coverage grows monotonically, slower if ray tracing disabled
      const coverageRate = flags.rayTracingDisabled ? 0.25 : 1.0;
      mapCoveragePct = Math.min(100, mapCoveragePct + rng() * 1.6 * coverageRate);

      // loop closures occasionally
      if (rng() < 0.05) loopClosureCount++;

      // drift accumulates, worse with missing depth clamp
      driftMeters += (flags.depthClampMissing ? rng() * 0.35 : rng() * 0.08);

      // goal progress
      const goalWindowSize = tickCount / goalsTotal;
      if (goalsReached < goalsTotal && totalTicks > (goalsReached + 1) * goalWindowSize * 0.7) {
        const succeeded = rng() > (flags.depthClampMissing ? 0.35 : 0.1);
        if (succeeded) {
          goalsReached++;
          this.emitLog(simTime, "goal_reached", "info", `Goal ${goalsReached}/${goalsTotal} reached`);
        } else {
          this.emitLog(simTime, "goal_timeout", "warning", `Goal ${goalsReached + 1} timed out`);
          errorCodes.add("ERR_GOAL_TIMEOUT");
        }
      }

      // nav stall detection during hybrid phase
      if (phaseState.phase === "HYBRID" && rng() < 0.015) {
        navStallDuringHybrid = true;
        this.emitLog(simTime, "nav_stall", "warning", "Navigation stalled during hybrid GPS window");
      }

      // collisions - rare, weighted up if depth clamp missing (bad perception)
      if (rng() < (flags.depthClampMissing ? 0.006 : 0.0015)) {
        collisions++;
        errorCodes.add("ERR_COLLISION");
        this.emitLog(simTime, "collision", "critical", "Collision detected with environment geometry");
      }

      // cmd_vel bounds violation
      if (rng() < 0.01) cmdVelViolations++;

      // synthetic pose (random walk clamped to loose bounds for the mosaic view)
      pose = {
        x: pose.x + (rng() - 0.5) * 0.4,
        y: pose.y + (rng() - 0.5) * 0.4,
        yaw: (pose.yaw + (rng() - 0.5) * 0.3) % (Math.PI * 2),
      };

      this.onEvent({
        type: "telemetry",
        timestampSim: simTime,
        payload: {
          phase: phaseState.phase,
          overallProgress: phaseState.overallProgress,
          gpsRadiusMeters: phaseState.gpsRadiusMeters,
          pose,
          tfValid,
          mapCoveragePct,
          goalsReached,
          goalsTotal,
          collisions,
          cmdVel: { linear: Math.abs(rng() * 0.6), angular: (rng() - 0.5) * 0.8 },
          score_hint: Math.round((tfValidTicks / totalTicks) * 100),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, tickMs));
    }

    if (flags.containerFlaky && !startupFailed && rng() < 0.3) {
      containerCrashed = true;
      errorCodes.add("ERR_STACK_CRASHED");
      this.emitLog(simTime, "stack_crashed", "critical", "Customer container exited unexpectedly");
    }

    const recoverySec =
      deniedOnsetSimTime !== null && recoverySimTime !== null ? recoverySimTime - deniedOnsetSimTime : 3;

    return this.finalize(errorCodes, {
      tfValidTicks,
      totalTicks,
      mapCoveragePct,
      loopClosureCount,
      goalsReached: containerCrashed ? 0 : goalsReached,
      goalsTotal,
      collisions,
      driftMeters,
      recoverySec,
      navStallDuringHybrid: navStallDuringHybrid ? 1 : 0,
      cmdVelViolations,
      explorationPct: mapCoveragePct,
    });
  }

  private emitLog(
    timestampSim: number,
    eventType: string,
    severity: "info" | "warning" | "critical",
    message: string,
    payload?: Record<string, unknown>
  ) {
    this.onEvent({ type: "log", timestampSim, eventType, severity, message, payload });
  }

  private finalize(errorCodes: Set<string>, stats: Record<string, number>): SimulationResult {
    const tfContinuityPct = stats.totalTicks > 0 ? (stats.tfValidTicks / stats.totalTicks) * 100 : 0;
    const localizationContinuity = clamp(tfContinuityPct - (errorCodes.has("ERR_TF_DUAL_PUBLISHER") ? 15 : 0));

    const slamMapQuality = clamp(
      stats.mapCoveragePct * 0.6 +
        Math.min(stats.loopClosureCount, 10) * 3 -
        stats.driftMeters * 4 -
        (errorCodes.has("ERR_GRID_RAYTRACING_DISABLED") ? 25 : 0)
    );

    const gpsDenialTransition = clamp(
      100 - stats.recoverySec * 6 - stats.navStallDuringHybrid * 30
    );

    const goalSuccessRate = stats.goalsTotal > 0 ? stats.goalsReached / stats.goalsTotal : 0;
    const navigationPerformance = clamp(
      goalSuccessRate * 80 +
        20 -
        (errorCodes.has("ERR_GOAL_TIMEOUT") ? 10 : 0) -
        (errorCodes.has("ERR_CMDVEL_TYPE_MISMATCH") ? 40 : 0)
    );

    const explorationCompleteness = clamp(stats.explorationPct);

    const safety = clamp(100 - stats.collisions * 60 - stats.cmdVelViolations * 4);

    const categoryScores: CategoryScores = {
      localizationContinuity,
      slamMapQuality,
      gpsDenialTransition,
      navigationPerformance,
      explorationCompleteness,
      safety,
    };

    const weights = this.scenario.scoringWeights;
    const overallScore = clamp(
      Object.entries(categoryScores).reduce((sum, [key, val]) => sum + val * (weights[key] ?? 0), 0)
    );

    const hasCriticalError = [...errorCodes].some((c) => ERROR_CODES[c]?.severity === "critical");
    const passFail = overallScore >= 70 && stats.collisions === 0 && !hasCriticalError;

    return {
      overallScore: Math.round(overallScore * 10) / 10,
      passFail,
      categoryScores: roundCategoryScores(categoryScores),
      errorCodes: [...errorCodes],
      stats,
    };
  }
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

function mapValues<T extends Record<string, number>>(obj: T, fn: (v: number) => number): T {
  const result = {} as T;
  for (const key of Object.keys(obj) as (keyof T)[]) {
    result[key] = fn(obj[key]) as T[keyof T];
  }
  return result;
}

function roundCategoryScores(scores: CategoryScores): CategoryScores {
  return {
    localizationContinuity: Math.round(scores.localizationContinuity * 10) / 10,
    slamMapQuality: Math.round(scores.slamMapQuality * 10) / 10,
    gpsDenialTransition: Math.round(scores.gpsDenialTransition * 10) / 10,
    navigationPerformance: Math.round(scores.navigationPerformance * 10) / 10,
    explorationCompleteness: Math.round(scores.explorationCompleteness * 10) / 10,
    safety: Math.round(scores.safety * 10) / 10,
  };
}
