import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import v1Router from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan(env.isProd ? "combined" : "dev"));

  const limiter = rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false });
  app.use("/v1", limiter);

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "spaceborn-backend" }));

  app.use("/v1", v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
