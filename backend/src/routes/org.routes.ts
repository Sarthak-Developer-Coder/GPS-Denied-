import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const org = await prisma.org.findUniqueOrThrow({ where: { id: req.auth!.orgId } });
    res.json(org);
  })
);

router.get(
  "/members",
  asyncHandler(async (req, res) => {
    const members = await prisma.user.findMany({
      where: { orgId: req.auth!.orgId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(members);
  })
);

const inviteSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "ENGINEER", "VIEWER"]),
  temporaryPassword: z.string().min(8),
});

router.post(
  "/members",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = inviteSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw ApiError.conflict("A user with this email already exists");
    const passwordHash = await bcrypt.hash(input.temporaryPassword, 12);
    const user = await prisma.user.create({
      data: { orgId: req.auth!.orgId, name: input.name, email: input.email, role: input.role, passwordHash },
    });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  })
);

const roleSchema = z.object({ role: z.enum(["ADMIN", "ENGINEER", "VIEWER"]) });

router.patch(
  "/members/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { role } = roleSchema.parse(req.body);
    const member = await prisma.user.findFirst({ where: { id: req.params.id, orgId: req.auth!.orgId } });
    if (!member) throw ApiError.notFound("Member not found");
    const updated = await prisma.user.update({ where: { id: member.id }, data: { role } });
    res.json({ id: updated.id, role: updated.role });
  })
);

router.get(
  "/api-keys",
  asyncHandler(async (req, res) => {
    const keys = await prisma.apiKey.findMany({
      where: { orgId: req.auth!.orgId },
      select: { id: true, label: true, keyPrefix: true, createdAt: true, revokedAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(keys);
  })
);

const createKeySchema = z.object({ label: z.string().min(1).max(100) });

router.post(
  "/api-keys",
  requireRole("ADMIN", "ENGINEER"),
  asyncHandler(async (req, res) => {
    const { label } = createKeySchema.parse(req.body);
    const rawKey = crypto.randomBytes(24).toString("hex");
    const keyPrefix = `sb_${rawKey.slice(0, 8)}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const record = await prisma.apiKey.create({
      data: { orgId: req.auth!.orgId, label, keyPrefix, keyHash },
    });
    // full key only ever shown once at creation time
    res.status(201).json({ id: record.id, label, keyPrefix, fullKey: `${keyPrefix}_${rawKey.slice(8)}` });
  })
);

router.delete(
  "/api-keys/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const key = await prisma.apiKey.findFirst({ where: { id: req.params.id, orgId: req.auth!.orgId } });
    if (!key) throw ApiError.notFound("API key not found");
    await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
    res.status(204).send();
  })
);

export default router;
