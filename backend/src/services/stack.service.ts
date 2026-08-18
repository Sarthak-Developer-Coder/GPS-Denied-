import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { parseJson, stringifyJson } from "../utils/json";

export async function listStacks(orgId: string) {
  const stacks = await prisma.stack.findMany({
    where: { orgId },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        include: { runs: { include: { result: true }, orderBy: { createdAt: "desc" }, take: 5 } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return stacks.map((stack) => ({
    ...stack,
    versions: stack.versions.map((version) => ({
      ...version,
      paramOverrides: parseJson<Record<string, unknown> | null>(version.paramOverrides, null),
      manifest: parseJson<Record<string, unknown> | null>(version.manifest, null),
      capabilities: parseJson<string[]>(version.capabilities, []),
      runs: version.runs.map((run) => ({
        ...run,
        result: run.result
          ? {
              ...run.result,
              categoryScores: parseJson<Record<string, number>>(run.result.categoryScores, {}),
              errorCodes: parseJson<string[]>(run.result.errorCodes, []),
              artifactRefs: parseJson<Record<string, string>>(run.result.artifactRefs, {}),
            }
          : run.result,
      })),
    })),
  }));
}

export async function getStack(orgId: string, stackId: string) {
  const stack = await prisma.stack.findFirst({
    where: { id: stackId, orgId },
    include: { versions: { orderBy: { createdAt: "desc" } } },
  });
  if (!stack) throw ApiError.notFound("Stack not found");
  return {
    ...stack,
    versions: stack.versions.map((version) => ({
      ...version,
      paramOverrides: parseJson<Record<string, unknown> | null>(version.paramOverrides, null),
      manifest: parseJson<Record<string, unknown> | null>(version.manifest, null),
      capabilities: parseJson<string[]>(version.capabilities, []),
    })),
  };
}

export async function createStack(orgId: string, name: string) {
  const existing = await prisma.stack.findFirst({ where: { orgId, name } });
  if (existing) throw ApiError.conflict("A stack with this name already exists in your org");
  return prisma.stack.create({ data: { orgId, name } });
}

export interface CreateVersionInput {
  version: string;
  submissionType: string;
  imageRef?: string;
  bagRef?: string;
  paramOverrides?: Record<string, unknown>;
  manifest?: Record<string, unknown>;
  cmdVelType?: string;
  capabilities?: string[];
  createdBy?: string;
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
      paramOverrides: input.paramOverrides ? stringifyJson(input.paramOverrides) : null,
      manifest: input.manifest ? stringifyJson(input.manifest) : null,
      cmdVelType: input.cmdVelType ?? "TwistStamped",
      capabilities: stringifyJson(input.capabilities ?? []),
      createdBy: input.createdBy,
    },
  });
}
