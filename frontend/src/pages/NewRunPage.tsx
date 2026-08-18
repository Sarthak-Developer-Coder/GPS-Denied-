import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { PARAMETER_GROUPS } from "../lib/constants";
import { useAppStore } from "../stores/appStore";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SectionHeading } from "../components/ui/SectionHeading";

const steps = ["Stack", "Scenario", "Configure", "Review"];

export function NewRunPage() {
  const navigate = useNavigate();
  const stacks = useAppStore((s) => s.stacks);
  const scenarios = useAppStore((s) => s.scenarios);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<"DOCKER_IMAGE" | "BAG_TRAJECTORY" | "PARAM_OVERRIDE">("PARAM_OVERRIDE");
  const [selectedStackVersionId, setSelectedStackVersionId] = useState<string>(stacks[0]?.versions[0]?.id ?? "");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0]?.id ?? "");
  const [seedMode, setSeedMode] = useState<"fixed" | "random">("fixed");
  const [seed, setSeed] = useState(424242);
  const [timeoutSec, setTimeoutSec] = useState(900);
  const [liveViewEnabled, setLiveViewEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stackName, setStackName] = useState("");
  const [versionName, setVersionName] = useState("1.0.0");
  const [imageRef, setImageRef] = useState("");
  const [bagRef, setBagRef] = useState("");
  const [manifestText, setManifestText] = useState('{\n  "stack_name": "",\n  "ros_distro": "humble",\n  "startup_timeout_s": 60\n}');
  const [paramText, setParamText] = useState('{\n  "Grid/RayTracing": true,\n  "Vis/MaxDepth": 8.0\n}');
  const [capabilitiesText, setCapabilitiesText] = useState("slam, navigation");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const selectedVersion = useMemo(
    () => stacks.flatMap((stack) => stack.versions.map((version) => ({ stack, version }))).find((item) => item.version.id === selectedStackVersionId),
    [selectedStackVersionId, stacks]
  );
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId);

  async function launchRun() {
    setSubmitting(true);
    try {
      const res = await api.post("/runs", {
        stackVersionId: selectedStackVersionId,
        scenarioId: selectedScenarioId,
        seed: seedMode === "fixed" ? seed : undefined,
        timeoutSec,
        liveViewEnabled,
      });
      navigate(`/runs/${res.data.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function registerStackVersion() {
    if (!stackName.trim() || !versionName.trim()) {
      setUploadStatus("Provide a stack name and version before uploading.");
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      let stack = stacks.find((item) => item.name.toLowerCase() === stackName.trim().toLowerCase());
      if (!stack) {
        const createdStack = await api.post("/stacks", { name: stackName.trim() });
        stack = { ...createdStack.data, versions: [] };
      }
      if (!stack) {
        throw new Error("Unable to resolve stack after creation");
      }

      const submissionType = tab;
      const parsedManifest = manifestText.trim() ? JSON.parse(manifestText) : null;
      const parsedParams = paramText.trim() ? JSON.parse(paramText) : null;
      const capabilities = capabilitiesText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean) as Array<"slam" | "navigation" | "exploration">;

      const version = await api.post(`/stacks/${stack.id}/versions`, {
        version: versionName.trim(),
        submissionType,
        imageRef: imageRef.trim() || undefined,
        bagRef: bagRef.trim() || undefined,
        paramOverrides: submissionType === "PARAM_OVERRIDE" ? parsedParams ?? undefined : undefined,
        manifest: parsedManifest ?? undefined,
        cmdVelType: submissionType === "DOCKER_IMAGE" ? "TwistStamped" : "TwistStamped",
        capabilities: capabilities.length > 0 ? capabilities : ["slam", "navigation"],
      });

      const refreshed = await api.get("/stacks");
      useAppStore.getState().setStacks(refreshed.data);
      setSelectedStackVersionId(version.data.id);
      setUploadStatus(`Uploaded ${stackName.trim()} v${version.data.version} and selected it for the run.`);
    } catch (error: any) {
      setUploadStatus(error.response?.data?.error?.message ?? error.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Launch"
        title="New Test Run"
        description="Choose a submitted stack or parameter-only reference override, bind it to a scenario, and launch a deterministic benchmark run."
      />

      <div className="grid gap-4 lg:grid-cols-[0.26fr_1fr]">
        <Card className="rounded-[28px] p-5">
          <div className="text-sm font-semibold text-white">Workflow</div>
          <div className="mt-4 space-y-3">
            {steps.map((label, idx) => (
              <button
                key={label}
                onClick={() => setStep(idx)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ${step === idx ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-space-900 text-xs">{idx + 1}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="rounded-[28px] p-6">
          {step === 0 ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-accent-400/20 bg-accent-400/10 p-5">
                <div className="text-xs uppercase tracking-[0.3em] text-accent-400/80">Upload / Register</div>
                <div className="mt-2 text-lg font-semibold text-white">Add a new stack version</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This is the actual upload entry point: create a stack, attach a version, and select it for the run.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <div className="mb-2 text-sm text-slate-300">Stack name</div>
                    <input value={stackName} onChange={(e) => setStackName(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-space-900 px-4 py-3 text-white" placeholder="Acme Nav Stack" />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-sm text-slate-300">Version</div>
                    <input value={versionName} onChange={(e) => setVersionName(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-space-900 px-4 py-3 text-white" placeholder="1.0.0" />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-sm text-slate-300">Docker image / registry ref</div>
                    <input value={imageRef} onChange={(e) => setImageRef(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-space-900 px-4 py-3 text-white" placeholder="registry.example.com/team/stack:tag" />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-sm text-slate-300">Bag / trajectory ref</div>
                    <input value={bagRef} onChange={(e) => setBagRef(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-space-900 px-4 py-3 text-white" placeholder="s3://bucket/run.mcap" />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label className="block md:col-span-2">
                    <div className="mb-2 text-sm text-slate-300">Manifest JSON</div>
                    <textarea value={manifestText} onChange={(e) => setManifestText(e.target.value)} rows={6} className="w-full rounded-2xl border border-white/10 bg-space-900 px-4 py-3 font-mono text-xs text-white" />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-sm text-slate-300">Capabilities</div>
                    <input value={capabilitiesText} onChange={(e) => setCapabilitiesText(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-space-900 px-4 py-3 text-white" placeholder="slam, navigation" />
                    <div className="mt-4 text-sm text-slate-400">Param overrides JSON</div>
                    <textarea value={paramText} onChange={(e) => setParamText(e.target.value)} rows={6} className="mt-2 w-full rounded-2xl border border-white/10 bg-space-900 px-4 py-3 font-mono text-xs text-white" />
                  </label>
                </div>

                {uploadStatus ? <div className="mt-4 rounded-2xl border border-white/10 bg-space-900/80 p-3 text-sm text-slate-200">{uploadStatus}</div> : null}

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={registerStackVersion} disabled={uploading}>
                    {uploading ? "Uploading..." : "Upload / Register Stack"}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {(["DOCKER_IMAGE", "BAG_TRAJECTORY", "PARAM_OVERRIDE"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setTab(value)}
                    className={`rounded-2xl px-4 py-2 text-sm ${tab === value ? "bg-white/12 text-white" : "bg-white/5 text-slate-400"}`}
                  >
                    {value.replace(/_/g, " ")}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {stacks
                  .flatMap((stack) => stack.versions.map((version) => ({ stack, version })))
                  .filter((item) => item.version.submissionType === tab)
                  .map(({ stack, version }) => (
                    <button
                      key={version.id}
                      onClick={() => setSelectedStackVersionId(version.id)}
                      className={`rounded-3xl border p-5 text-left transition ${selectedStackVersionId === version.id ? "border-accent-400/60 bg-accent-400/10" : "border-white/10 bg-white/5 hover:bg-white/8"}`}
                    >
                      <div className="text-lg font-semibold text-white">{stack.name}</div>
                      <div className="mt-1 text-sm text-slate-400">v{version.version}</div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {version.capabilities.map((cap) => (
                          <span key={cap} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300">{cap}</span>
                        ))}
                      </div>
                    </button>
                  ))}
              </div>

              {tab === "PARAM_OVERRIDE" ? (
                <div className="rounded-3xl border border-white/10 bg-space-900/70 p-5">
                  <div className="mb-4 text-lg font-semibold text-white">Reference stack override schema</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {PARAMETER_GROUPS.map((group) => (
                      <div key={group.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-sm font-semibold text-white">{group.label}</div>
                        <div className="mt-3 space-y-3">
                          {group.fields.map((field) => (
                            <div key={field.key}>
                              <div className="text-sm text-slate-200">{field.key}</div>
                              <div className="mt-1 text-xs leading-5 text-slate-400">{field.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  className={`rounded-3xl border p-5 text-left ${selectedScenarioId === scenario.id ? "border-accent-400/60 bg-accent-400/10" : "border-white/10 bg-white/5"}`}
                >
                  <div className="h-32 rounded-2xl bg-[radial-gradient(circle_at_25%_30%,rgba(94,234,212,0.35),transparent_25%),linear-gradient(135deg,#0f172a,#1e293b,#0f172a)]" />
                  <div className="mt-4 text-lg font-semibold text-white">{scenario.name}</div>
                  <div className="mt-1 text-sm text-slate-400">{scenario.description}</div>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                    <span>{Math.round(scenario.durationSec / 60)} min</span>
                    <span>{scenario.difficulty}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-lg font-semibold text-white">Reproducibility</div>
                <div className="mt-4 flex gap-3">
                  <button className={`rounded-2xl px-4 py-2 text-sm ${seedMode === "fixed" ? "bg-white/12 text-white" : "bg-space-900 text-slate-400"}`} onClick={() => setSeedMode("fixed")}>Fixed seed</button>
                  <button className={`rounded-2xl px-4 py-2 text-sm ${seedMode === "random" ? "bg-white/12 text-white" : "bg-space-900 text-slate-400"}`} onClick={() => setSeedMode("random")}>Random seed</button>
                </div>
                <label className="mt-4 block text-sm text-slate-300">
                  RNG seed
                  <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} disabled={seedMode === "random"} className="mt-2 w-full rounded-2xl border border-white/10 bg-space-900 px-4 py-3 text-white" />
                </label>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-lg font-semibold text-white">Execution</div>
                <label className="mt-4 block text-sm text-slate-300">
                  Timeout (seconds)
                  <input type="number" value={timeoutSec} onChange={(e) => setTimeoutSec(Number(e.target.value))} className="mt-2 w-full rounded-2xl border border-white/10 bg-space-900 px-4 py-3 text-white" />
                </label>
                <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
                  <input type="checkbox" checked={liveViewEnabled} onChange={(e) => setLiveViewEnabled(e.target.checked)} />
                  Enable live run viewer
                </label>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-lg font-semibold text-white">Review</div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Review label="Stack" value={selectedVersion ? `${selectedVersion.stack.name} v${selectedVersion.version.version}` : "Not selected"} />
                  <Review label="Scenario" value={selectedScenario?.name ?? "Not selected"} />
                  <Review label="Seed" value={seedMode === "fixed" ? String(seed) : "Randomized per run"} />
                  <Review label="Timeout" value={`${timeoutSec}s`} />
                </div>
              </div>
              <div className="rounded-3xl border border-accent-400/20 bg-accent-400/10 p-5">
                <div className="text-lg font-semibold text-white">Estimated cost</div>
                <div className="mt-4 text-4xl font-semibold text-gradient">{Math.ceil((selectedScenario?.durationSec ?? 0) / 60)} sim-min</div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  This estimate uses scenario duration and does not include retries caused by platform infrastructure events.
                </p>
                <Button className="mt-6 w-full" onClick={launchRun} disabled={!selectedStackVersionId || !selectedScenarioId || submitting}>
                  {submitting ? "Launching..." : "Launch Run"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex justify-between">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
            <Button variant="secondary" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} disabled={step === steps.length - 1}>Next</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-space-900/70 p-4">
      <div className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}
