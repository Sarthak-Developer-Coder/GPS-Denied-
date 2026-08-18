import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { createStack, createStackVersion, getStack, listStacks } from "../services/stack.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listStacks(req.auth!.orgId));
  })
);

const createStackSchema = z.object({ name: z.string().min(2).max(100) });

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name } = createStackSchema.parse(req.body);
    res.status(201).json(await createStack(req.auth!.orgId, name));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await getStack(req.auth!.orgId, req.params.id));
  })
);

const createVersionSchema = z.object({
  version: z.string().min(1).max(50),
  submissionType: z.enum(["DOCKER_IMAGE", "BAG_TRAJECTORY", "PARAM_OVERRIDE"]),
  imageRef: z.string().optional(),
  bagRef: z.string().optional(),
  paramOverrides: z.record(z.any()).optional(),
  manifest: z.record(z.any()).optional(),
  cmdVelType: z.enum(["Twist", "TwistStamped"]).optional(),
  capabilities: z.array(z.enum(["slam", "navigation", "exploration"])).optional(),
});

router.post(
  "/:id/versions",
  asyncHandler(async (req, res) => {
    const input = createVersionSchema.parse(req.body);
    const version = await createStackVersion(req.auth!.orgId, req.params.id, {
      ...input,
      createdBy: req.auth!.sub,
    });
    res.status(201).json(version);
  })
);

export default router;
