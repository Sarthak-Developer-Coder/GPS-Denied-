import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Run, RunEvent, TelemetryPayload } from "../types";
import { RunMosaic } from "../components/RunMosaic";
import { RunInfoRail } from "../components/RunInfoRail";
import { PhaseTimeline } from "../components/PhaseTimeline";
import { EventLog } from "../components/EventLog";
import { DiagnosticsPanel } from "../components/DiagnosticsPanel";
import { ScoreBreakdownChart } from "../components/Charts";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useRunLiveStream } from "../hooks/useRunLiveStream";
import { useAppStore } from "../stores/appStore";

export function RunDetailPage() {
  const { id } = useParams();
  const [run, setRun] = useState<Run | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const liveEvents = useAppStore((s) => (id ? s.liveTelemetry[id] ?? [] : []));
  useRunLiveStream(id);

  async function load() {
    if (!id) return;
    const [runRes, eventsRes] = await Promise.all([api.get(`/runs/${id}`), api.get(`/runs/${id}/events`)]);
    setRun(runRes.data);
    setEvents(eventsRes.data);
  }

  useEffect(() => {
    load().catch((err) => console.error(err));
  }, [id]);

  const latestTelemetry = useMemo<TelemetryPayload | null>(() => {
    const last = [...liveEvents].reverse().find((evt) => evt.type === "telemetry");
    return last?.type === "telemetry" ? last.payload : null;
  }, [liveEvents]);

  const allEvents = useMemo<RunEvent[]>(() => {
    const socketEvents: RunEvent[] = liveEvents
      .filter((evt) => evt.type === "log")
      .map((evt) => ({ timestampSim: evt.timestampSim, eventType: evt.eventType, payload: evt.payload ?? {}, severity: evt.severity }));
    return [...events, ...socketEvents].sort((a, b) => a.timestampSim - b.timestampSim);
  }, [events, liveEvents]);

  const breakdown = run?.result
    ? Object.entries(run.result.categoryScores).map(([key, value]) => ({
        label: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        value,
      }))
    : [];

  if (!run) return <div className="text-slate-300">Loading run...</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.72fr]">
        <div className="space-y-4">
          <RunMosaic telemetry={latestTelemetry} />
          <PhaseTimeline phase={latestTelemetry?.phase} progress={latestTelemetry?.overallProgress} />
        </div>
        <RunInfoRail run={run} telemetry={latestTelemetry} onCancel={async () => { await api.delete(`/runs/${run.id}`); await load(); }} onRefresh={() => load()} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[28px] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-white">Score & Report</div>
              <div className="mt-1 text-sm text-slate-400">Pass/fail, weighted category breakdown, and artifact access.</div>
            </div>
            {run.result ? (
              <div className={`rounded-full px-4 py-2 text-sm font-semibold ${run.result.passFail ? "bg-status-pass/15 text-status-pass" : "bg-status-fail/15 text-status-fail"}`}>
                {run.result.passFail ? "PASS" : "FAIL"} · {run.result.overallScore.toFixed(1)}
              </div>
            ) : null}
          </div>
          {run.result ? <ScoreBreakdownChart data={breakdown} /> : <div className="text-sm text-slate-400">Run still in progress.</div>}
          {run.result ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {Object.entries(run.result.artifactRefs).map(([key, href]) => (
                <a key={key} href={href} target="_blank" rel="noreferrer"><Button variant="secondary">Download {key}</Button></a>
              ))}
            </div>
          ) : null}
        </Card>
        <DiagnosticsPanel errorCodes={run.result?.errorCodes ?? []} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <EventLog events={allEvents} />
        <Card className="rounded-[28px] p-5">
          <div className="text-lg font-semibold text-white">Trajectory comparison</div>
          <div className="mt-4 h-[420px] rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_50%_40%,rgba(94,234,212,0.08),transparent_35%),linear-gradient(180deg,#0f172a,#111827)] p-4">
            <div className="relative h-full overflow-hidden rounded-[24px] border border-white/10 bg-space-900">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
                <path d="M10,80 C20,70 30,40 45,30 S75,25 90,12" fill="none" stroke="#5eead4" strokeWidth="2.2" strokeDasharray="0" />
                <path d="M9,82 C23,66 34,44 50,34 S70,34 86,18" fill="none" stroke="#f472b6" strokeWidth="2" strokeDasharray="4 3" />
                <circle cx="10" cy="80" r="2.5" fill="#22d3ee" />
                <circle cx="90" cy="12" r="3" fill="#34d399" />
                <circle cx="86" cy="18" r="3" fill="#f87171" />
              </svg>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
