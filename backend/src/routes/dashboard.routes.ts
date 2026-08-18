import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { dashboardSummary } from "../services/run.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    res.json(await dashboardSummary(req.auth!.orgId));
  })
);

export default router;
