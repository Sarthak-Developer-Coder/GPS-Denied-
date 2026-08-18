import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 7)
  );
}

export async function registerOrgAndAdmin(input: {
  orgName: string;
  email: string;
  password: string;
  name: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, 12);

  const org = await prisma.org.create({
    data: {
      name: input.orgName,
      slug: slugify(input.orgName),
      users: {
        create: {
          email: input.email,
          passwordHash,
          name: input.name,
          role: "ADMIN",
        },
      },
    },
    include: { users: true },
  });

  const user = org.users[0];
  return issueTokens(user.id, org.id, user.role, user.email).then((tokens) => ({ org, user, ...tokens }));
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized("Invalid email or password");
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  const tokens = await issueTokens(user.id, user.orgId, user.role, user.email);
  return { user, ...tokens };
}

export async function refreshSession(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw ApiError.unauthorized("User no longer exists");
  return issueTokens(user.id, user.orgId, user.role, user.email);
}

async function issueTokens(userId: string, orgId: string, role: string, email: string) {
  const accessToken = signAccessToken({ sub: userId, orgId, role, email });
  const refreshToken = signRefreshToken({ sub: userId });
  return { accessToken, refreshToken };
}
