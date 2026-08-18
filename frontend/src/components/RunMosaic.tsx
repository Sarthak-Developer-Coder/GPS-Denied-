import { motion } from "framer-motion";
import { Card } from "./ui/Card";
import { TelemetryPayload } from "../types";
import { formatPercent } from "../lib/utils";

function paneTitle(title: string, subtitle: string) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-slate-400">{subtitle}</div>
      </div>
      <div className="h-2 w-2 rounded-full bg-accent-400 shadow-[0_0_10px_rgba(94,234,212,0.6)]" />
    </div>
  );
}

export function RunMosaic({ telemetry }: { telemetry?: TelemetryPayload | null }) {
  const coverage = telemetry?.mapCoveragePct ?? 0;
  const progress = telemetry?.overallProgress ?? 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden rounded-[28px] p-4">
        {paneTitle("RGB Camera", "Live synthetic mission feed")}
        <div className="relative h-64 overflow-hidden rounded-3xl bg-gradient-to-br from-space-700 to-space-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_45%,rgba(94,234,212,0.2),transparent_28%),radial-gradient(circle_at_70%_25%,rgba(244,114,182,0.16),transparent_20%)]" />
          <div className="absolute inset-0 animate-scan-line bg-gradient-to-b from-transparent via-white/5 to-transparent" />
          <div className="absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200">
            Pose X/Y: {telemetry?.pose.x.toFixed(1) ?? "0.0"} / {telemetry?.pose.y.toFixed(1) ?? "0.0"}
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden rounded-[28px] p-4">
        {paneTitle("Depth", "Terrain + obstacle gradient")}
        <div className="relative h-64 rounded-3xl bg-[radial-gradient(circle_at_20%_25%,rgba(94,234,212,0.35),transparent_30%),linear-gradient(135deg,#09111f,#18263e_40%,#2e4364_78%,#5eead4)]">
          <div className="absolute inset-x-5 bottom-5 h-24 rounded-3xl border border-white/10 bg-black/25 p-4 text-sm text-white/80">
            Depth confidence adapts during jamming and loop-closure phases.
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden rounded-[28px] p-4">
        {paneTitle("Occupancy Grid", "Coverage vs explorable area")}
        <div className="relative h-64 rounded-3xl border border-white/10 bg-space-900 p-4">
          <div className="grid h-full grid-cols-12 gap-1">
            {Array.from({ length: 96 }).map((_, idx) => {
              const threshold = (idx / 95) * 100;
              const filled = threshold <= coverage;
              return (
                <motion.div
                  key={idx}
                  animate={{ opacity: filled ? 1 : 0.25, scale: filled ? 1 : 0.96 }}
                  className={filled ? "rounded bg-accent-400/80" : "rounded bg-space-700"}
                />
              );
            })}
          </div>
          <div className="absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200">
            Coverage: {formatPercent(coverage)}
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden rounded-[28px] p-4">
        {paneTitle("3D Cloud", "Interactive cloud approximation")}
        <div className="relative h-64 overflow-hidden rounded-3xl bg-gradient-to-br from-space-900 via-space-700 to-space-900">
          {Array.from({ length: 90 }).map((_, idx) => (
            <motion.div
              key={idx}
              className="absolute h-2 w-2 rounded-full bg-accent-400/75"
              style={{
                left: `${(idx * 7) % 100}%`,
                top: `${(idx * 13) % 100}%`,
              }}
              animate={{
                x: [0, (idx % 5) - 2, 0],
                y: [0, (idx % 7) - 3, 0],
                opacity: [0.25, 1, 0.35],
              }}
              transition={{ duration: 3 + (idx % 5), repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200">
            <span>Mission progress: {formatPercent(progress * 100)}</span>
            <span>Loop closure ready</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
