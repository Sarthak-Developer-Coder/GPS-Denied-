import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { useAuthStore } from "../stores/authStore";

export function AppShell() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-aurora">
      <div className="mx-auto flex max-w-[1680px] gap-5 px-4 py-5 lg:px-5">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="glass-panel rounded-[32px] border-white/10 p-4 md:p-6"
          >
            <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-accent-400/80">Mission Control</div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Benchmark autonomy in <span className="text-gradient">GPS-denied simulation</span>
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                  Headless Gazebo-style scenarios, deterministic seeds, live telemetry, and scoring across localization,
                  SLAM quality, transition recovery, exploration, and safety.
                </p>
              </div>
              <div className="flex gap-3 text-sm text-slate-300">
                <div className="metric-pill">Org: {user?.org?.name ?? "-"}</div>
                <div className="metric-pill">Plan: {user?.org?.planTier ?? "-"}</div>
              </div>
            </div>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
