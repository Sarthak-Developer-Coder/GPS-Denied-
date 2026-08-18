import { create } from "zustand";
import { DashboardSummary, LiveSocketEvent, Run, RunEvent, Scenario, StackEntity } from "../types";

interface AppState {
  dashboard: DashboardSummary | null;
  scenarios: Scenario[];
  stacks: StackEntity[];
  runs: Run[];
  activeRunEvents: Record<string, RunEvent[]>;
  liveTelemetry: Record<string, LiveSocketEvent["event"][]>;
  setDashboard: (dashboard: DashboardSummary) => void;
  setScenarios: (scenarios: Scenario[]) => void;
  setStacks: (stacks: StackEntity[]) => void;
  setRuns: (runs: Run[]) => void;
  upsertRun: (run: Run) => void;
  setRunEvents: (runId: string, events: RunEvent[]) => void;
  pushLiveEvent: (event: LiveSocketEvent) => void;
  clearLiveEvents: (runId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  dashboard: null,
  scenarios: [],
  stacks: [],
  runs: [],
  activeRunEvents: {},
  liveTelemetry: {},
  setDashboard: (dashboard) => set({ dashboard }),
  setScenarios: (scenarios) => set({ scenarios }),
  setStacks: (stacks) => set({ stacks }),
  setRuns: (runs) => set({ runs }),
  upsertRun: (run) =>
    set((state) => ({
      runs: [run, ...state.runs.filter((r) => r.id !== run.id)],
    })),
  setRunEvents: (runId, events) =>
    set((state) => ({ activeRunEvents: { ...state.activeRunEvents, [runId]: events } })),
  pushLiveEvent: ({ runId, event }) =>
    set((state) => ({
      liveTelemetry: {
        ...state.liveTelemetry,
        [runId]: [...(state.liveTelemetry[runId] ?? []), event].slice(-300),
      },
    })),
  clearLiveEvents: (runId) =>
    set((state) => {
      const next = { ...state.liveTelemetry };
      delete next[runId];
      return { liveTelemetry: next };
    }),
}));
