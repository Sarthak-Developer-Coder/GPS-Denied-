import { Router } from "express";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import {
  cancelRun,
  createRun,
  getRun,
  getRunEvents,
  getRunResult,
  listRuns,
} from "../services/run.service";

const router = Router();
router.use(requireAuth);

const ARTIFACTS_ROOT = path.join(__dirname, "..", "..", "artifacts");
const ALLOWED_ARTIFACTS = new Set(["log.txt", "summary.json", "map.json", "trajectory.json"]);

const createRunSchema = z.object({
  stackVersionId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  seed: z.number().int().optional(),
  timeoutSec: z.number().int().min(60).max(3600).optional(),
  liveViewEnabled: z.boolean().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createRunSchema.parse(req.body);
    const run = await createRun(req.auth!.orgId, { ...input, startedById: req.auth!.sub });
    res.status(201).json(run);
  })
);

const listQuerySchema = z.object({
  status: z.string().optional(),
  stackId: z.string().optional(),
  scenarioId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = listQuerySchema.parse(req.query);
    res.json(await listRuns(req.auth!.orgId, filter));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await getRun(req.auth!.orgId, req.params.id));
  })
);

router.get(
  "/:id/result",
  asyncHandler(async (req, res) => {
    res.json(await getRunResult(req.auth!.orgId, req.params.id));
  })
);

router.get(
  "/:id/events",
  asyncHandler(async (req, res) => {
    const after = req.query.after ? Number(req.query.after) : undefined;
    res.json(await getRunEvents(req.auth!.orgId, req.params.id, after));
  })
);

router.get(
  "/:id/artifacts/:filename",
  asyncHandler(async (req, res) => {
    const { id, filename } = req.params;
    if (!ALLOWED_ARTIFACTS.has(filename)) throw ApiError.badRequest("Unknown artifact");
    await getRun(req.auth!.orgId, id); // authorizes access
    const filePath = path.join(ARTIFACTS_ROOT, id, filename);
    if (!filePath.startsWith(ARTIFACTS_ROOT) || !fs.existsSync(filePath)) {
      throw ApiError.notFound("Artifact not found (run may not have completed yet)");
    }
    res.sendFile(filePath);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await cancelRun(req.auth!.orgId, req.params.id));
  })
);

export default router;
