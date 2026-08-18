import { Card } from "./ui/Card";
import { StatusBadge } from "./StatusBadge";
import { Button } from "./ui/Button";
import { Run, TelemetryPayload } from "../types";
import { formatDuration, formatPercent } from "../lib/utils";

export function RunInfoRail({
  run,
  telemetry,
  onCancel,
  onRefresh,
}: {
  run: Run;
  telemetry?: TelemetryPayload | null;
  onCancel?: () => void;
  onRefresh?: () => void;
}) {
  const elapsedSec =
    run.startedAt && !run.endedAt
      ? Math.max(0, (Date.now() - new Date(run.startedAt).getTime()) / 1000)
      : run.startedAt && run.endedAt
        ? (new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / 1000
        : 0;

  return (
    <Card className="rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Run Info</div>
          <div className="mt-2 text-xl font-semibold text-white">{run.stackVersion.stack.name}</div>
          <div className="mt-1 text-sm text-slate-400">Scenario: {run.scenario.name}</div>
        </div>
        <StatusBadge status={run.status} />
      </div>

      <div className="mt-6 grid gap-3 text-sm">
        <Metric label="Phase" value={telemetry?.phase ?? "Awaiting stream"} />
        <Metric label="Elapsed" value={formatDuration(elapsedSec)} />
        <Metric label="GPS quality" value={telemetry?.gpsRadiusMeters ? `±${Math.round(telemetry.gpsRadiusMeters)}m` : "Denied"} />
        <Metric label="TF status" value={telemetry?.tfValid ? "Valid" : "Unstable"} />
        <Metric label="Map coverage" value={formatPercent(telemetry?.mapCoveragePct ?? 0)} />
        <Metric label="Goals reached" value={`${telemetry?.goalsReached ?? 0}/${telemetry?.goalsTotal ?? run.scenario.goalDefinition.totalGoals}`} />
        <Metric label="Collisions" value={String(telemetry?.collisions ?? 0)} />
        <Metric label="Current cmd_vel" value={`${(telemetry?.cmdVel.linear ?? 0).toFixed(2)} m/s · ${(telemetry?.cmdVel.angular ?? 0).toFixed(2)} rad/s`} />
      </div>

      <div className="mt-6 flex gap-3">
        {run.status === "RUNNING" || run.status === "QUEUED" ? (
          <Button variant="danger" className="flex-1" onClick={onCancel}>
            Cancel Run
          </Button>
        ) : null}
        <Button variant="secondary" className="flex-1" onClick={onRefresh}>
          Refresh
        </Button>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
