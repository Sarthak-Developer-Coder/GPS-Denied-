import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { SectionHeading } from "../components/ui/SectionHeading";
import { Card } from "../components/ui/Card";

interface Entry {
  rank: number;
  runId: string;
  stackName: string;
  version: string;
  scenarioName: string;
  score: number;
  passFail: boolean;
  date: string;
}

export function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    api.get("/leaderboard").then((res) => setEntries(res.data));
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Leaderboard" title="Per-org ranked results" description="Benchmark outcomes ranked by score across scenario and stack-version combinations." />
      <Card className="rounded-[28px] p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-3 font-medium">Rank</th>
                <th className="pb-3 font-medium">Stack</th>
                <th className="pb-3 font-medium">Scenario</th>
                <th className="pb-3 font-medium">Score</th>
                <th className="pb-3 font-medium">Result</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={`${entry.runId}-${entry.rank}`} className="border-t border-white/6">
                  <td className="py-4 text-lg font-semibold text-accent-400">#{entry.rank}</td>
                  <td className="py-4 text-white">{entry.stackName} <span className="text-slate-500">v{entry.version}</span></td>
                  <td className="py-4 text-slate-300">{entry.scenarioName}</td>
                  <td className="py-4 text-white">{entry.score.toFixed(1)}</td>
                  <td className="py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.passFail ? "bg-status-pass/15 text-status-pass" : "bg-status-fail/15 text-status-fail"}`}>
                      {entry.passFail ? "PASS" : "FAIL"}
                    </span>
                  </td>
                  <td className="py-4 text-slate-400">{new Date(entry.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
