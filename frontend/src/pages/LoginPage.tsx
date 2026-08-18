import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/Button";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    email: "demo@spaceborn.dev",
    password: "Passw0rd!",
    name: "",
    orgName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res =
        mode === "login"
          ? await api.post("/auth/login", { email: form.email, password: form.password })
          : await api.post("/auth/register", {
              email: form.email,
              password: form.password,
              name: form.name,
              orgName: form.orgName,
            });
      setSession({ user: res.data.user, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-950 px-4 py-10 text-white">
      <div className="absolute inset-0 bg-aurora" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.1),transparent_30%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} className="space-y-7">
          <div className="metric-pill">GPS-denied SLAM and Nav2 benchmark cloud</div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-tight md:text-7xl">
            Build confidence in autonomy before the field test.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-300">
            Upload your ROS 2 stack, replay bags, or tune reference RTAB-Map parameters. SpaceBorn runs the scenario,
            streams the mission, and scores resilience across localization, exploration, navigation, and safety.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["20+", "Concurrent runs"],
              ["<500ms", "Live telemetry latency"],
              ["±2%", "Reproducibility window"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-3xl font-semibold text-gradient">{value}</div>
                <div className="mt-2 text-sm text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[36px] p-6 md:p-8">
          <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium ${mode === tab ? "bg-white/12 text-white" : "text-slate-400"}`}
                onClick={() => setMode(tab)}
              >
                {tab === "login" ? "Sign In" : "Create Org"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "register" ? (
              <>
                <Field label="Your Name" value={form.name} onChange={(value) => setForm((f) => ({ ...f, name: value }))} />
                <Field label="Organization" value={form.orgName} onChange={(value) => setForm((f) => ({ ...f, orgName: value }))} />
              </>
            ) : null}
            <Field label="Email" type="email" value={form.email} onChange={(value) => setForm((f) => ({ ...f, email: value }))} />
            <Field label="Password" type="password" value={form.password} onChange={(value) => setForm((f) => ({ ...f, password: value }))} />
            {error ? <div className="rounded-2xl border border-status-fail/20 bg-status-fail/10 p-3 text-sm text-status-fail">{error}</div> : null}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Processing..." : mode === "login" ? "Enter Mission Control" : "Create Organization"}
            </Button>
          </form>

          <div className="mt-5 rounded-2xl border border-accent-400/15 bg-accent-400/10 p-4 text-sm text-slate-200">
            Demo login: <span className="font-semibold">demo@spaceborn.dev</span> / <span className="font-semibold">Passw0rd!</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-300">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-space-900 px-4 py-3 text-white outline-none transition focus:border-accent-400/70"
      />
    </label>
  );
}
