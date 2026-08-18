import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { LoadingScreen } from "./components/LoadingScreen";
import { useBootstrap } from "./hooks/useBootstrap";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NewRunPage } from "./pages/NewRunPage";
import { RunsPage } from "./pages/RunsPage";
import { RunDetailPage } from "./pages/RunDetailPage";
import { ScenariosPage } from "./pages/ScenariosPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { StacksPage } from "./pages/StacksPage";
import { SettingsPage } from "./pages/SettingsPage";
import { DocsPage } from "./pages/DocsPage";
import { api } from "./lib/api";
import { useAuthStore } from "./stores/authStore";

export default function App() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  useBootstrap(Boolean(accessToken));

  useEffect(() => {
    if (!accessToken || user?.org) return;
    api.get("/auth/me").then((res) => setUser(res.data)).catch(() => logout());
  }, [accessToken, logout, setUser, user?.org]);

  if (!accessToken) {
    return <LoginPage />;
  }

  if (!user?.org) {
    return <LoadingScreen label="Bootstrapping workspace..." />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/new-run" element={<NewRunPage />} />
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/runs/:id" element={<RunDetailPage />} />
        <Route path="/scenarios" element={<ScenariosPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/stacks" element={<StacksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
