import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { attachSocketServer } from "./websocket/socketServer";
import { startRunWorker } from "./queue/runWorker";
import { isBullmqCompatibleRedis } from "./lib/redis";

async function main() {
  const app = createApp();
  const httpServer = http.createServer(app);

  attachSocketServer(httpServer);
  const bullmqReady = await isBullmqCompatibleRedis();
  const worker = bullmqReady ? startRunWorker() : null;
  if (!bullmqReady) {
    console.warn("BullMQ worker disabled: Redis server is below version 5, so runs will stay queued in this environment.");
  }

  httpServer.listen(env.port, () => {
    console.log(`SpaceBorn backend listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async () => {
    console.log("Shutting down gracefully...");
    await worker?.close?.().catch(() => undefined);
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
