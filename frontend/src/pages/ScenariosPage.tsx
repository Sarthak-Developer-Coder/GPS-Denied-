import { SectionHeading } from "../components/ui/SectionHeading";
import { Card } from "../components/ui/Card";
import { useAppStore } from "../stores/appStore";

export function ScenariosPage() {
  const scenarios = useAppStore((s) => s.scenarios);

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Catalog" title="Scenario registry" description="Read-only disclosure of world files, sensor suites, timing, and GPS-jamming profiles so customers know exactly what the benchmark will throw at them." />
      <div className="grid gap-5 xl:grid-cols-2">
        {scenarios.map((scenario) => (
          <Card key={scenario.id} className="rounded-[28px] p-5">
            <div className="h-40 rounded-[24px] bg-[radial-gradient(circle_at_25%_25%,rgba(94,234,212,0.28),transparent_25%),linear-gradient(135deg,#0f172a,#111827,#1e293b)]" />
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-white">{scenario.name}</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">{scenario.description}</div>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{scenario.difficulty}</div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Meta label="World file" value={scenario.worldFile} />
              <Meta label="Duration" value={`${Math.round(scenario.durationSec / 60)} minutes`} />
              <Meta label="Goals" value={String(scenario.goalDefinition.totalGoals)} />
              <Meta label="Camera" value={String((scenario.sensorSuite as any).camera?.model ?? "N/A")} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}
