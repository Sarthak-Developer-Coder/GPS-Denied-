import { RunEvent } from "../types";

export function EventLog({ events }: { events: RunEvent[] }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-white">Timeline / Event Log</div>
        <div className="text-sm text-slate-400">{events.length} events</div>
      </div>
      <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
        {events.map((evt, idx) => (
          <div key={`${evt.eventType}-${idx}-${evt.timestampSim}`} className="rounded-2xl border border-white/10 bg-space-900/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">{evt.eventType.replace(/_/g, " ")}</div>
                <div className="mt-1 text-sm text-slate-300">{formatPayload(evt.payload)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">t+{evt.timestampSim.toFixed(1)}s</div>
                <div className={severityColor(evt.severity)}>{evt.severity}</div>
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 ? <div className="text-sm text-slate-400">No events yet.</div> : null}
      </div>
    </div>
  );
}

function severityColor(severity: string) {
  if (severity === "critical") return "mt-1 text-xs text-status-fail";
  if (severity === "warning") return "mt-1 text-xs text-status-warn";
  return "mt-1 text-xs text-status-info";
}

function formatPayload(payload: Record<string, unknown>) {
  const entries = Object.entries(payload ?? {});
  if (entries.length === 0) return "No additional payload.";
  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ");
}
