import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { Prisma, SubmissionType } from "@prisma/client";

export async function listStacks(orgId: string) {
  return prisma.stack.findMany({
    where: { orgId },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        include: { runs: { include: { result: true }, orderBy: { createdAt: "desc" }, take: 5 } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getStack(orgId: string, stackId: string) {
  const stack = await prisma.stack.findFirst({
    where: { id: stackId, orgId },
    include: { versions: { orderBy: { createdAt: "desc" } } },
  });
  if (!stack) throw ApiError.notFound("Stack not found");
  return stack;
}

export async function createStack(orgId: string, name: string) {
  const existing = await prisma.stack.findFirst({ where: { orgId, name } });
  if (existing) throw ApiError.conflict("A stack with this name already exists in your org");
  return prisma.stack.create({ data: { orgId, name } });
}

export interface CreateVersionInput {
  version: string;
  submissionType: SubmissionType;
  imageRef?: string;
  bagRef?: string;
  paramOverrides?: Record<string, unknown>;
  manifest?: Record<string, unknown>;
  cmdVelType?: string;
  capabilities?: string[];
  createdBy?: string;
}

function toJsonValue(value?: Record<string, unknown>) {
  return value as Prisma.InputJsonValue | undefined;
}

export async function createStackVersion(orgId: string, stackId: string, input: CreateVersionInput) {
  const stack = await prisma.stack.findFirst({ where: { id: stackId, orgId } });
  if (!stack) throw ApiError.notFound("Stack not found");

  const existing = await prisma.stackVersion.findFirst({ where: { stackId, version: input.version } });
  if (existing) throw ApiError.conflict("This version already exists for the stack");

  return prisma.stackVersion.create({
    data: {
      stackId,
      version: input.version,
      submissionType: input.submissionType,
      imageRef: input.imageRef,
      bagRef: input.bagRef,
      paramOverrides: toJsonValue(input.paramOverrides),
      manifest: toJsonValue(input.manifest),
      cmdVelType: input.cmdVelType ?? "TwistStamped",
      capabilities: input.capabilities ?? [],
      createdBy: input.createdBy,
    },
  });
}
