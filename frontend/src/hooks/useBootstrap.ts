import { useEffect } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useAppStore } from "../stores/appStore";

export function useBootstrap(enabled: boolean) {
  const setUser = useAuthStore((s) => s.setUser);
  const setDashboard = useAppStore((s) => s.setDashboard);
  const setScenarios = useAppStore((s) => s.setScenarios);
  const setStacks = useAppStore((s) => s.setStacks);
  const setRuns = useAppStore((s) => s.setRuns);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function load() {
      const [me, dashboard, scenarios, stacks, runs] = await Promise.all([
        api.get("/auth/me"),
        api.get("/dashboard/summary"),
        api.get("/scenarios"),
        api.get("/stacks"),
        api.get("/runs?page=1&pageSize=30"),
      ]);
      if (cancelled) return;
      setUser(me.data);
      setDashboard(dashboard.data);
      setScenarios(scenarios.data);
      setStacks(stacks.data);
      setRuns(runs.data.items);
    }

    load().catch((err) => console.error("Bootstrap failed", err));
    return () => {
      cancelled = true;
    };
  }, [enabled, setDashboard, setRuns, setScenarios, setStacks, setUser]);
}
