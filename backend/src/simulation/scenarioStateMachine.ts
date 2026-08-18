export type ScenarioPhase = "GPS_AVAILABLE" | "HYBRID" | "DENIED";

export interface JammingProfile {
  /** Fraction of total duration spent in each phase, must sum to 1. */
  phaseFractions: { gpsAvailable: number; hybrid: number; denied: number };
  /** GPS accuracy radius in meters at the start/end of each phase. */
  gpsRadiusMeters: { start: number; hybridStart: number; hybridEnd: number; denied: number };
}

export interface PhaseState {
  phase: ScenarioPhase;
  phaseProgress: number; // 0..1 within current phase
  gpsRadiusMeters: number | null; // null = no signal at all
  overallProgress: number; // 0..1 of whole scenario
}

/**
 * Deterministic function of sim-time -> current scenario phase + GPS quality,
 * ported from the SpaceBorn README's GPS-jamming mermaid state machine into code
 * (see Spec §4.1.3 / §4.1.4).
 */
export function resolvePhaseState(
  simTimeSec: number,
  durationSec: number,
  profile: JammingProfile
): PhaseState {
  const overallProgress = Math.min(1, Math.max(0, simTimeSec / durationSec));
  const { gpsAvailable, hybrid } = profile.phaseFractions;

  const gpsEnd = gpsAvailable;
  const hybridEnd = gpsAvailable + hybrid;

  if (overallProgress < gpsEnd) {
    return {
      phase: "GPS_AVAILABLE",
      phaseProgress: gpsEnd === 0 ? 1 : overallProgress / gpsEnd,
      gpsRadiusMeters: profile.gpsRadiusMeters.start,
      overallProgress,
    };
  }

  if (overallProgress < hybridEnd) {
    const phaseProgress = (overallProgress - gpsEnd) / (hybridEnd - gpsEnd || 1);
    const radius =
      profile.gpsRadiusMeters.hybridStart +
      (profile.gpsRadiusMeters.hybridEnd - profile.gpsRadiusMeters.hybridStart) * phaseProgress;
    return { phase: "HYBRID", phaseProgress, gpsRadiusMeters: radius, overallProgress };
  }

  const phaseProgress = (overallProgress - hybridEnd) / (1 - hybridEnd || 1);
  return { phase: "DENIED", phaseProgress, gpsRadiusMeters: null, overallProgress };
}
