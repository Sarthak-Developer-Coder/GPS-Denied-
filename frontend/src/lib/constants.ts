export const STATUS_COLORS: Record<string, string> = {
  QUEUED: "text-status-info border-status-info/30 bg-status-info/10",
  PROVISIONING: "text-accent-400 border-accent-400/30 bg-accent-400/10",
  RUNNING: "text-accent-500 border-accent-500/30 bg-accent-500/10",
  SCORING: "text-accent-purple border-accent-purple/30 bg-accent-purple/10",
  PASSED: "text-status-pass border-status-pass/30 bg-status-pass/10",
  FAILED: "text-status-fail border-status-fail/30 bg-status-fail/10",
  ERROR: "text-status-fail border-status-fail/30 bg-status-fail/10",
  CANCELLED: "text-slate-300 border-slate-300/20 bg-slate-300/10",
};

export const ERROR_CODE_COPY: Record<string, string> = {
  ERR_TF_DUAL_PUBLISHER: "Two nodes published odom→base_link, causing TF flapping.",
  ERR_CMDVEL_TYPE_MISMATCH: "The declared cmd_vel type did not match what the stack emitted.",
  ERR_GRID_RAYTRACING_DISABLED: "Ray tracing was disabled, so frontier free-space clearing never stabilized.",
  ERR_ODOM_DEPTH_CLAMP_MISSING: "Depth outliers likely caused frame-to-frame odometry jumps.",
  ERR_LOCALIZATION_LOST: "The map→odom→base_link chain disappeared for too long.",
  ERR_GOAL_TIMEOUT: "The robot failed to complete a mission goal inside budget.",
  ERR_COLLISION: "Physical collision was detected, forcing a fail state.",
  ERR_STACK_CRASHED: "The submitted autonomy container crashed mid-run.",
  ERR_CONTAINER_STARTUP_FAILED: "The submitted container never became healthy before timeout.",
};

export const PARAMETER_GROUPS = [
  {
    label: "Grid",
    fields: [
      { key: "Grid/RayTracing", type: "boolean", description: "Clears free space correctly so frontier detection does not explode." },
    ],
  },
  {
    label: "Odometry",
    fields: [
      { key: "Vis/MaxDepth", type: "number", description: "Clamps noisy far-range depth to avoid odometry spikes." },
      { key: "Odom/Holonomic", type: "boolean", description: "Controls whether motion model assumes lateral slip capability." },
    ],
  },
  {
    label: "Loop Closure",
    fields: [
      { key: "RGBD/OptimizeMaxError", type: "number", description: "Rejects unstable loop closures to stabilize drift." },
    ],
  },
  {
    label: "Costmap",
    fields: [
      { key: "local_costmap.inflation_radius", type: "number", description: "Balances safety margin against narrow corridor mobility." },
    ],
  },
  {
    label: "Controller",
    fields: [
      { key: "controller_server.min_x_velocity_threshold", type: "number", description: "Prevents tiny noisy velocity commands from stalling progress." },
    ],
  },
];
