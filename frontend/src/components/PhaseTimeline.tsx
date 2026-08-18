import { ScenarioPhase } from "../types";

const phaseLabels: Array<{ key: ScenarioPhase; label: string; color: string }> = [
  { key: "GPS_AVAILABLE", label: "GPS", color: "from-status-pass/70 to-status-pass/30" },
  { key: "HYBRID", label: "Hybrid", color: "from-status-warn/80 to-status-warn/30" },
  { key: "DENIED", label: "Denied", color: "from-status-fail/80 to-status-fail/30" },
];

export function PhaseTimeline({ phase, progress }: { phase?: ScenarioPhase; progress?: number }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-slate-300">GPS Jamming Timeline</span>
        <span className="text-slate-400">Current phase: {phase ?? "Pending"}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {phaseLabels.map((item, idx) => {
          const active = phase === item.key;
          return (
            <div key={item.key} className="relative overflow-hidden rounded-2xl border border-white/10 bg-space-900 px-4 py-3">
              <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-${active ? "100" : "30"}`} />
              <div className="relative flex items-center justify-between text-sm">
                <span className="font-medium text-white">{item.label}</span>
                <span className="text-slate-300">{idx + 1}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-accent-400 via-accent-500 to-accent-purple" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
      </div>
    </div>
  );
}
