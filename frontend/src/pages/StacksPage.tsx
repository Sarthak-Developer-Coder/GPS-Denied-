import { useAppStore } from "../stores/appStore";
import { SectionHeading } from "../components/ui/SectionHeading";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export function StacksPage() {
  const stacks = useAppStore((s) => s.stacks);

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Library" title="Submitted stacks and versions" description="Inspect manifests, see run history, and choose which stack version to benchmark next." />
      <div className="grid gap-5 xl:grid-cols-2">
        {stacks.map((stack) => (
          <Card key={stack.id} className="rounded-[28px] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-white">{stack.name}</div>
                <div className="mt-1 text-sm text-slate-400">{stack.versions.length} version(s)</div>
              </div>
              <Button variant="secondary">Re-run latest</Button>
            </div>
            <div className="mt-5 space-y-4">
              {stack.versions.map((version) => {
                const bestScore = Math.max(...(version.runs?.map((run) => run.result?.overallScore ?? 0) ?? [0]));
                return (
                  <div key={version.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold text-white">v{version.version}</div>
                        <div className="mt-1 text-sm text-slate-400">{version.submissionType.replace(/_/g, " ")}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Best score</div>
                        <div className="mt-1 text-lg font-semibold text-gradient">{bestScore.toFixed(1)}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {version.capabilities.map((cap) => (
                        <span key={cap} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300">{cap}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
