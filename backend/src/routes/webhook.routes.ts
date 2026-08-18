import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { stringifyJson } from "../utils/json";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const hooks = await prisma.webhook.findMany({ where: { orgId: req.auth!.orgId } });
    res.json(hooks.map(({ secret: _secret, ...rest }) => rest));
  })
);

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(["run.completed", "run.failed", "run.started"])).min(1),
});

router.post(
  "/",
  requireRole("ADMIN", "ENGINEER"),
  asyncHandler(async (req, res) => {
    const { url, events } = createSchema.parse(req.body);
    const secret = crypto.randomBytes(24).toString("hex");
    const hook = await prisma.webhook.create({ data: { orgId: req.auth!.orgId, url, events: stringifyJson(events), secret } });
    res.status(201).json(hook);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const hook = await prisma.webhook.findFirst({ where: { id: req.params.id, orgId: req.auth!.orgId } });
    if (!hook) throw ApiError.notFound("Webhook not found");
    await prisma.webhook.delete({ where: { id: hook.id } });
    res.status(204).send();
  })
);

export default router;
