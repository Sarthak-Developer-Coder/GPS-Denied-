import { Router } from "express";
import authRoutes from "./auth.routes";
import orgRoutes from "./org.routes";
import stackRoutes from "./stack.routes";
import scenarioRoutes from "./scenario.routes";
import runRoutes from "./run.routes";
import leaderboardRoutes from "./leaderboard.routes";
import webhookRoutes from "./webhook.routes";
import dashboardRoutes from "./dashboard.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/org", orgRoutes);
router.use("/stacks", stackRoutes);
router.use("/scenarios", scenarioRoutes);
router.use("/runs", runRoutes);
router.use("/leaderboard", leaderboardRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
