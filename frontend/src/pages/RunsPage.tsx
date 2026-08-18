import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { SectionHeading } from "../components/ui/SectionHeading";
import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/StatusBadge";
import { useAppStore } from "../stores/appStore";
import { formatDate } from "../lib/utils";

export function RunsPage() {
  const runs = useAppStore((s) => s.runs);
  const [status, setStatus] = useState<string>("ALL");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return runs.filter((run) => {
      if (status !== "ALL" && run.status !== status) return false;
      if (!query) return true;
      const haystack = `${run.stackVersion.stack.name} ${run.scenario.name} ${run.id}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [query, runs, status]);

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Runs" title="Active and historical benchmark runs" description="Filter by status, search by stack, and open any run for live telemetry or scoring details." />
      <Card className="rounded-[28px] p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {["ALL", "QUEUED", "RUNNING", "PASSED", "FAILED", "ERROR", "CANCELLED"].map((value) => (
              <button key={value} onClick={() => setStatus(value)} className={`rounded-full px-4 py-2 text-sm ${status === value ? "bg-white/12 text-white" : "bg-white/5 text-slate-400"}`}>
                {value}
              </button>
            ))}
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by stack or run id" className="w-full rounded-2xl border border-white/10 bg-space-900 px-4 py-3 text-sm text-white md:max-w-xs" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-3 font-medium">Run ID</th>
                <th className="pb-3 font-medium">Stack</th>
                <th className="pb-3 font-medium">Scenario</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Score</th>
                <th className="pb-3 font-medium">Started By</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((run) => (
                <tr key={run.id} className="border-t border-white/6">
                  <td className="py-4 font-mono text-xs text-accent-400">
                    <Link to={`/runs/${run.id}`}>{run.id.slice(0, 8)}</Link>
                  </td>
                  <td className="py-4 text-white">{run.stackVersion.stack.name} <span className="text-slate-500">v{run.stackVersion.version}</span></td>
                  <td className="py-4 text-slate-300">{run.scenario.name}</td>
                  <td className="py-4"><StatusBadge status={run.status} /></td>
                  <td className="py-4 text-white">{run.result?.overallScore?.toFixed(1) ?? "-"}</td>
                  <td className="py-4 text-slate-400">{run.startedByUser?.name ?? "-"}</td>
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
