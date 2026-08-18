import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { registerOrgAndAdmin, login, refreshSession } from "../services/auth.service";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

const registerSchema = z.object({
  orgName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const { org, user, accessToken, refreshToken } = await registerOrgAndAdmin(input);
    res.status(201).json({
      org: { id: org.id, name: org.name, slug: org.slug, planTier: org.planTier },
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    });
  })
);

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await login(email, password);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, orgId: user.orgId },
      accessToken,
      refreshToken,
    });
  })
);

const refreshSchema = z.object({ refreshToken: z.string() });

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await refreshSession(refreshToken);
    res.json(tokens);
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.auth!.sub },
      include: { org: true },
    });
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      org: {
        id: user.org.id,
        name: user.org.name,
        planTier: user.org.planTier,
        quotaSimMinutes: user.org.quotaSimMinutes,
        usedSimMinutes: user.org.usedSimMinutes,
        maxConcurrentRuns: user.org.maxConcurrentRuns,
      },
    });
  })
);

export default router;
