import { Card } from "../components/ui/Card";
import { SectionHeading } from "../components/ui/SectionHeading";

export function DocsPage() {
  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Docs" title="Integration guide" description="Everything a customer needs to connect a stack, submit a run, and interpret the scoring pipeline." />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="rounded-[28px] p-6">
          <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-li:text-slate-300">
            <h3>Customer contract</h3>
            <p>Stacks subscribe to namespaced sensor topics and must publish cmd_vel, map, and TF according to the declared manifest.</p>
            <pre className="overflow-auto rounded-2xl border border-white/10 bg-space-900 p-4 text-sm text-slate-200"><code>{`stack_name: acme-nav-stack
version: 1.4.0
cmd_vel_type: TwistStamped
capabilities: [slam, navigation, exploration]
ros_distro: humble
resource_requests:
  cpu: 4
  memory_gb: 8
  gpu: false
startup_timeout_s: 60`}</code></pre>
            <h3>Representative API flow</h3>
            <pre className="overflow-auto rounded-2xl border border-white/10 bg-space-900 p-4 text-sm text-slate-200"><code>{`POST /v1/stacks
POST /v1/stacks/{id}/versions
POST /v1/runs
GET  /v1/runs/{id}
GET  /v1/runs/{id}/result
WS   /socket.io -> run:subscribe`}</code></pre>
            <h3>How the simulation maps to real infra</h3>
            <p>This demo backend uses a deterministic seeded simulation engine that mirrors the GPS-jamming state machine, error detectors, live telemetry stream, and scoring model. The worker boundary is already isolated so Gazebo/ROS 2 pods can replace the synthetic engine later without changing the product surface.</p>
          </div>
        </Card>
        <Card className="rounded-[28px] p-6">
          <div className="text-lg font-semibold text-white">CLI sketch</div>
          <div className="mt-4 space-y-4 text-sm text-slate-300">
            <Snippet label="Submit a stack" value="spaceborn-cli submit --image registry.example/acme:1.4.0 --manifest stack.yaml" />
            <Snippet label="Launch a run" value="spaceborn-cli run --stack-version sv_123 --scenario warehouse-gps-denial-standard --seed 424242" />
            <Snippet label="Watch status" value="spaceborn-cli status run_123 --follow" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Snippet({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-space-900 p-4">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</div>
      <div className="mt-2 font-mono text-xs text-accent-400">{value}</div>
    </div>
  );
}
