export type RunStatus =
  | "QUEUED"
  | "PROVISIONING"
  | "RUNNING"
  | "SCORING"
  | "PASSED"
  | "FAILED"
  | "ERROR"
  | "CANCELLED";

export type ScenarioPhase = "GPS_AVAILABLE" | "HYBRID" | "DENIED";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "ENGINEER" | "VIEWER";
  org?: {
    id: string;
    name: string;
    planTier: string;
    quotaSimMinutes: number;
    usedSimMinutes: number;
    maxConcurrentRuns: number;
  };
  orgId?: string;
}

export interface Scenario {
  id: string;
  key: string;
  name: string;
  version: string;
  description: string;
  worldFile: string;
  difficulty: string;
  durationSec: number;
  jammingProfile: {
    phaseFractions: { gpsAvailable: number; hybrid: number; denied: number };
    gpsRadiusMeters: { start: number; hybridStart: number; hybridEnd: number; denied: number | null };
  };
  goalDefinition: { totalGoals: number; explorationTarget: boolean };
  scoringWeights: Record<string, number>;
  sensorSuite: Record<string, unknown>;
}

export interface StackVersion {
  id: string;
  version: string;
  submissionType: "DOCKER_IMAGE" | "BAG_TRAJECTORY" | "PARAM_OVERRIDE";
  imageRef?: string;
  bagRef?: string;
  paramOverrides?: Record<string, unknown>;
  manifest?: Record<string, unknown>;
  cmdVelType: "Twist" | "TwistStamped";
  capabilities: string[];
  createdAt: string;
  runs?: Run[];
}

export interface StackEntity {
  id: string;
  name: string;
  createdAt: string;
  versions: StackVersion[];
}

export interface RunResult {
  id: string;
  overallScore: number;
  passFail: boolean;
  categoryScores: Record<string, number>;
  errorCodes: string[];
  artifactRefs: Record<string, string>;
}

export interface Run {
  id: string;
  status: RunStatus;
  seed: number;
  timeoutSec: number;
  liveViewEnabled: boolean;
  queuedAt: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  scenario: Scenario;
  stackVersion: StackVersion & { stack: { id: string; name: string } };
  result?: RunResult | null;
  startedByUser?: { name: string; email: string };
}

export interface RunEvent {
  id?: string;
  runId?: string;
  timestampSim: number;
  timestampWall?: string;
  eventType: string;
  payload: Record<string, unknown>;
  severity: "info" | "warning" | "critical";
}

export interface TelemetryPayload {
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
}

export interface LiveSocketEvent {
  runId: string;
  event:
    | { type: "telemetry"; timestampSim: number; payload: TelemetryPayload }
    | { type: "log"; timestampSim: number; eventType: string; severity: "info" | "warning" | "critical"; message: string; payload?: Record<string, unknown> };
}

export interface DashboardSummary {
  runsThisMonth: number;
  passRate: number;
  avgScore: number;
  simMinutesUsed: number;
  simMinutesQuota: number;
  recentRuns: Run[];
  scoreTrend: Array<{ runId: string; date: string; score: number; stackName: string; version: string }>;
}
