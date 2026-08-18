import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";
import { useAuthStore } from "../stores/authStore";

const links = [
  ["/dashboard", "Dashboard"],
  ["/new-run", "New Test Run"],
  ["/runs", "Runs"],
  ["/scenarios", "Scenarios"],
  ["/leaderboard", "Leaderboard"],
  ["/stacks", "Stacks"],
  ["/settings", "Org Settings"],
  ["/docs", "Docs"],
] as const;

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="glass-panel panel-grid sticky top-5 hidden h-[calc(100vh-2.5rem)] min-w-[280px] flex-col justify-between rounded-[32px] p-5 lg:flex">
      <div>
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-accent-500/15 to-accent-purple/15 p-5">
          <div className="text-xs uppercase tracking-[0.3em] text-accent-400">SpaceBorn</div>
          <div className="mt-2 text-2xl font-bold tracking-tight">Nav-Testing Platform</div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Bring your autonomy stack. We run the GPS-denial benchmark, stream the mission, and score the result.
          </p>
        </div>
        <nav className="mt-6 space-y-2">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition-colors",
                  isActive ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/6 hover:text-white"
                )
              }
            >
              <span>{label}</span>
              <span className="text-xs text-slate-500">/</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold text-white">{user?.name}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">{user?.role}</div>
        <div className="mt-1 text-sm text-slate-300">{user?.org?.name}</div>
        <button onClick={logout} className="mt-4 text-sm font-medium text-accent-400 hover:text-accent-300">
          Sign out
        </button>
      </div>
    </aside>
  );
}
