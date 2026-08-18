import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { getScenario, listScenarios } from "../services/scenario.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await listScenarios());
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await getScenario(req.params.id));
  })
);

export default router;
