import { useEffect } from "react";
import { getSocket } from "../lib/socket";
import { useAuthStore } from "../stores/authStore";
import { useAppStore } from "../stores/appStore";
import { LiveSocketEvent } from "../types";

export function useRunLiveStream(runId?: string | null) {
  const token = useAuthStore((s) => s.accessToken);
  const pushLiveEvent = useAppStore((s) => s.pushLiveEvent);

  useEffect(() => {
    if (!runId || !token) return;
    const socket = getSocket(token);
    const onEvent = (payload: LiveSocketEvent) => {
      if (payload.runId === runId) {
        pushLiveEvent(payload);
      }
    };
    socket.emit("run:subscribe", runId);
    socket.on("run:event", onEvent);

    return () => {
      socket.emit("run:unsubscribe", runId);
      socket.off("run:event", onEvent);
    };
  }, [runId, token, pushLiveEvent]);
}
