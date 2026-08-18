import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { leaderboard } from "../services/run.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const scenarioId = typeof req.query.scenario_id === "string" ? req.query.scenario_id : undefined;
    res.json(await leaderboard(req.auth!.orgId, scenarioId));
  })
);

export default router;
