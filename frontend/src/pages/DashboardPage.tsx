import { Link } from "react-router-dom";
import { SectionHeading } from "../components/ui/SectionHeading";
import { KpiCard } from "../components/KpiCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ScoreTrendChart } from "../components/Charts";
import { StatusBadge } from "../components/StatusBadge";
import { useAppStore } from "../stores/appStore";
import { formatDate } from "../lib/utils";

export function DashboardPage() {
  const dashboard = useAppStore((s) => s.dashboard);

  if (!dashboard) {
    return <div className="text-slate-300">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Overview"
        title="Org benchmark command center"
        description="Track throughput, quality, and quota pressure across your latest navigation and SLAM test runs."
        action={
          <Link to="/new-run">
            <Button>Launch New Test</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Runs This Month" value={dashboard.runsThisMonth} helper="Completed + active benchmark jobs" />
        <KpiCard label="Pass Rate" value={`${dashboard.passRate}%`} helper="Hard-gated by safety and critical diagnostics" />
        <KpiCard label="Average Score" value={dashboard.avgScore.toFixed(1)} helper="Mean across scored runs" />
        <KpiCard label="Sim-Minutes" value={`${dashboard.simMinutesUsed}/${dashboard.simMinutesQuota}`} helper="Current plan quota utilization" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <Card className="rounded-[28px] p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-white">Score trend</div>
              <div className="mt-1 text-sm text-slate-400">One line per run sequence across recent stack versions.</div>
            </div>
          </div>
          <ScoreTrendChart data={dashboard.scoreTrend} />
        </Card>
        <Card className="rounded-[28px] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-white">System status</div>
              <div className="mt-1 text-sm text-slate-400">Worker pool, queue, and launch shortcuts</div>
            </div>
            <div className="h-2.5 w-2.5 rounded-full bg-status-pass shadow-[0_0_16px_rgba(52,211,153,0.7)]" />
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Worker pool available: 5 GPU-backed simulation workers online.</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Queue latency nominal: average dispatch under 40 seconds.</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Artifacts retention: 90 days on current plan.</div>
          </div>
          <div className="mt-5 grid gap-3">
            <Link to="/runs"><Button variant="secondary" className="w-full">View Run History</Button></Link>
            <Link to="/docs"><Button variant="ghost" className="w-full">Open Integration Guide</Button></Link>
          </div>
        </Card>
      </div>

      <Card className="rounded-[28px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-white">Recent runs</div>
            <div className="mt-1 text-sm text-slate-400">Latest activity across active and completed scenarios.</div>
          </div>
          <Link to="/runs" className="text-sm text-accent-400 hover:text-accent-300">See all runs</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-3 font-medium">Run</th>
                <th className="pb-3 font-medium">Stack</th>
                <th className="pb-3 font-medium">Scenario</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Score</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentRuns.map((run) => (
                <tr key={run.id} className="border-t border-white/6">
                  <td className="py-4 font-mono text-xs text-slate-300">{run.id.slice(0, 8)}</td>
                  <td className="py-4 text-white">{run.stackVersion.stack.name}</td>
                  <td className="py-4 text-slate-300">{run.scenario.name}</td>
                  <td className="py-4"><StatusBadge status={run.status} /></td>
                  <td className="py-4 text-white">{run.result?.overallScore?.toFixed(1) ?? "-"}</td>
                  <td className="py-4 text-slate-400">{formatDate(run.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
