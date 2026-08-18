/**
 * Canonical list of diagnostic/error codes the platform can detect during a run,
 * matching SpaceBorn Spec §5. Each carries a human explanation + remediation hint
 * so the Score & Report screen can teach customers how to fix their stack.
 */
export interface ErrorCodeDef {
  code: string;
  title: string;
  explanation: string;
  remediation: string;
  severity: "warning" | "critical";
}

export const ERROR_CODES: Record<string, ErrorCodeDef> = {
  ERR_TF_DUAL_PUBLISHER: {
    code: "ERR_TF_DUAL_PUBLISHER",
    title: "Dual TF publisher on odom→base_link",
    explanation:
      "Two nodes are publishing the odom→base_link transform simultaneously, causing the TF tree to flap between conflicting values.",
    remediation:
      "Ensure only one node (typically your odometry source or SLAM node) publishes odom→base_link. Disable the duplicate publisher or remap it to a distinct frame.",
    severity: "critical",
  },
  ERR_CMDVEL_TYPE_MISMATCH: {
    code: "ERR_CMDVEL_TYPE_MISMATCH",
    title: "cmd_vel message type mismatch",
    explanation:
      "Your stack publishes geometry_msgs/Twist where TwistStamped was declared in stack.yaml (or vice-versa), so velocity commands were dropped by the bridge.",
    remediation:
      "Update stack.yaml's cmd_vel_type field to match what your controller actually publishes, or add a twist_stamper/twist_mux conversion node.",
    severity: "critical",
  },
  ERR_GRID_RAYTRACING_DISABLED: {
    code: "ERR_GRID_RAYTRACING_DISABLED",
    title: "Grid/RayTracing disabled — entire map flagged as frontier",
    explanation:
      "RTAB-Map's Grid/RayTracing parameter is disabled, so free space is never cleared and the whole map is treated as unexplored frontier.",
    remediation: "Set Grid/RayTracing=true in your RTAB-Map parameter overrides.",
    severity: "warning",
  },
  ERR_ODOM_DEPTH_CLAMP_MISSING: {
    code: "ERR_ODOM_DEPTH_CLAMP_MISSING",
    title: "Unclamped depth causing odometry jumps",
    explanation:
      "Large per-frame pose jumps were detected, consistent with unclamped depth values feeding odometry (max depth range not enforced).",
    remediation: "Set Vis/MaxDepth to a sane bound (e.g. 8.0m) to reject noisy far-range depth returns.",
    severity: "warning",
  },
  ERR_LOCALIZATION_LOST: {
    code: "ERR_LOCALIZATION_LOST",
    title: "Localization lost",
    explanation: "No valid map→odom→base_link TF chain was available for longer than the allowed window.",
    remediation:
      "Check loop-closure detection thresholds and ensure the stack re-localizes after GPS-denial transitions.",
    severity: "critical",
  },
  ERR_GOAL_TIMEOUT: {
    code: "ERR_GOAL_TIMEOUT",
    title: "Navigation goal timeout",
    explanation: "One or more navigation goals were not reached within the scenario's allotted time budget.",
    remediation: "Review planner/controller tuning and costmap inflation settings for the scenario's terrain.",
    severity: "warning",
  },
  ERR_COLLISION: {
    code: "ERR_COLLISION",
    title: "Collision detected",
    explanation: "The robot made unintended contact with an obstacle or environment boundary.",
    remediation: "Tighten costmap inflation radius and verify sensor coverage has no blind spots.",
    severity: "critical",
  },
  ERR_STACK_CRASHED: {
    code: "ERR_STACK_CRASHED",
    title: "Customer stack process crashed",
    explanation: "The submitted container exited unexpectedly during the run.",
    remediation: "Check the run log artifact for the stack's stderr output near the crash timestamp.",
    severity: "critical",
  },
  ERR_CONTAINER_STARTUP_FAILED: {
    code: "ERR_CONTAINER_STARTUP_FAILED",
    title: "Container failed to start within timeout",
    explanation: "The submitted container did not become healthy within startup_timeout_s from stack.yaml.",
    remediation: "Increase startup_timeout_s or optimize your image's boot sequence (lazy-load heavy models).",
    severity: "critical",
  },
};

export type ErrorCode = keyof typeof ERROR_CODES;
