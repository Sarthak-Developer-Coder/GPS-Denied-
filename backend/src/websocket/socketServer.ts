import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../lib/prisma";
import { subscribeToRun, RunSubscription } from "./pubsub";
import { env } from "../config/env";

export function attachSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
    path: "/socket.io",
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("missing_token"));
    try {
      socket.data.auth = verifyAccessToken(token);
      next();
    } catch {
      next(new Error("invalid_token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const subscriptions = new Map<string, RunSubscription>();

    socket.on("run:subscribe", async (runId: string) => {
      try {
        const run = await prisma.run.findUnique({ where: { id: runId } });
        if (!run || run.orgId !== socket.data.auth.orgId) {
          socket.emit("run:error", { runId, message: "Run not found or access denied" });
          return;
        }
        if (subscriptions.has(runId)) return;

        const sub = subscribeToRun(runId, (event) => {
          socket.emit("run:event", { runId, event });
        });
        subscriptions.set(runId, sub);
        socket.emit("run:subscribed", { runId, status: run.status });
      } catch (err) {
        socket.emit("run:error", { runId, message: "Failed to subscribe" });
      }
    });

    socket.on("run:unsubscribe", async (runId: string) => {
      const sub = subscriptions.get(runId);
      if (sub) {
        await sub.unsubscribe();
        subscriptions.delete(runId);
      }
    });

    socket.on("disconnect", () => {
      subscriptions.forEach((sub) => sub.unsubscribe().catch(() => undefined));
      subscriptions.clear();
    });
  });

  return io;
}
