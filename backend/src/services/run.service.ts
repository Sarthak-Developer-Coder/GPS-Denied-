import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { requestCancellation } from "../queue/cancellationRegistry";
import { enqueueRun } from "../queue/runQueue";
import { parseJson } from "../utils/json";

const ACTIVE_STATUSES = ["QUEUED", "PROVISIONING", "RUNNING", "SCORING"] as const;

export interface CreateRunInput {
  stackVersionId: string;
  scenarioId: string;
  seed?: number;
  timeoutSec?: number;
  liveViewEnabled?: boolean;
  startedById: string;
}

export async function createRun(orgId: string, input: CreateRunInput) {
  const org = await prisma.org.findUniqueOrThrow({ where: { id: orgId } });

  const activeCount = await prisma.run.count({ where: { orgId, status: { in: [...ACTIVE_STATUSES] } } });
  if (activeCount >= org.maxConcurrentRuns) {
    throw ApiError.tooMany(
      `Concurrent run quota reached (${activeCount}/${org.maxConcurrentRuns}). Wait for a run to finish or upgrade your plan.`
    );
  }
  if (org.usedSimMinutes >= org.quotaSimMinutes) {
    throw ApiError.tooMany("Monthly simulation-minutes quota exhausted for this org.");
  }

  const stackVersion = await prisma.stackVersion.findFirst({
    where: { id: input.stackVersionId, stack: { orgId } },
  });
  if (!stackVersion) throw ApiError.notFound("Stack version not found");

  const scenario = await prisma.scenario.findUnique({ where: { id: input.scenarioId } });
  if (!scenario || !scenario.isActive) throw ApiError.notFound("Scenario not found");

  const seed = input.seed ?? Math.floor(Math.random() * 1_000_000);

  const run = await prisma.run.create({
    data: {
      orgId,
      stackVersionId: input.stackVersionId,
      scenarioId: input.scenarioId,
      seed,
      timeoutSec: input.timeoutSec ?? 900,
      liveViewEnabled: input.liveViewEnabled ?? true,
      startedById: input.startedById,
      status: "QUEUED",
    },
  });

  await enqueueRun(run.id);

  return run;
}

export interface ListRunsFilter {
  status?: string;
  stackId?: string;
  scenarioId?: string;
  page?: number;
  pageSize?: number;
}

export async function listRuns(orgId: string, filter: ListRunsFilter) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 20, 100);

  const where = {
    orgId,
    ...(filter.status ? { status: filter.status as any } : {}),
    ...(filter.scenarioId ? { scenarioId: filter.scenarioId } : {}),
    ...(filter.stackId ? { stackVersion: { stackId: filter.stackId } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.run.findMany({
      where,
      include: {
        scenario: true,
        stackVersion: { include: { stack: true } },
        result: true,
        startedByUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.run.count({ where }),
  ]);

  return { items: items.map(normalizeRun), total, page, pageSize };
}

export async function getRun(orgId: string, runId: string) {
  const run = await prisma.run.findFirst({
    where: { id: runId, orgId },
    include: {
      scenario: true,
      stackVersion: { include: { stack: true } },
      result: true,
      startedByUser: { select: { name: true, email: true } },
    },
  });
  if (!run) throw ApiError.notFound("Run not found");
  return normalizeRun(run);
}

export async function getRunResult(orgId: string, runId: string) {
  const run = await getRun(orgId, runId);
  const result = await prisma.runResult.findUnique({ where: { runId: run.id } });
  if (!result) throw ApiError.notFound("Run result not yet available");
  return {
    ...result,
    categoryScores: parseJson<Record<string, number>>(result.categoryScores, {}),
    errorCodes: parseJson<string[]>(result.errorCodes, []),
    artifactRefs: parseJson<Record<string, string>>(result.artifactRefs, {}),
  };
}

export async function getRunEvents(orgId: string, runId: string, afterSimTime?: number) {
  await getRun(orgId, runId);
  const events = await prisma.runEvent.findMany({
    where: { runId, ...(afterSimTime !== undefined ? { timestampSim: { gt: afterSimTime } } : {}) },
    orderBy: { timestampSim: "asc" },
  });
  return events.map((event) => ({ ...event, payload: parseJson<Record<string, unknown>>(event.payload, {}) }));
}

export async function cancelRun(orgId: string, runId: string) {
  const run = await getRun(orgId, runId);
  if (!ACTIVE_STATUSES.includes(run.status as any)) {
    throw ApiError.badRequest("Run is not currently active");
  }
  requestCancellation(runId);
  await prisma.run.update({ where: { id: runId }, data: { status: "CANCELLED" } });
  return { cancelled: true };
}

export async function dashboardSummary(orgId: string) {
  const [runsThisMonth, passCount, recentRuns, org] = await Promise.all([
    prisma.run.count({
      where: { orgId, createdAt: { gte: new Date(new Date().setDate(1)) } },
    }),
    prisma.run.count({ where: { orgId, status: "PASSED" } }),
    prisma.run.findMany({
      where: { orgId },
      include: { scenario: true, stackVersion: { include: { stack: true } }, result: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.org.findUniqueOrThrow({ where: { id: orgId } }),
  ]);

  const totalRuns = await prisma.run.count({ where: { orgId } });
  const passRate = totalRuns > 0 ? Math.round((passCount / totalRuns) * 1000) / 10 : 0;

  const avgScoreAgg = await prisma.runResult.aggregate({
    where: { run: { orgId } },
    _avg: { overallScore: true },
  });

  const trend = await prisma.run.findMany({
    where: { orgId, result: { isNot: null } },
    include: { result: true, stackVersion: { include: { stack: true } } },
    orderBy: { createdAt: "asc" },
    take: 60,
  });

  return {
    runsThisMonth,
    passRate,
    avgScore: Math.round((avgScoreAgg._avg.overallScore ?? 0) * 10) / 10,
    simMinutesUsed: org.usedSimMinutes,
    simMinutesQuota: org.quotaSimMinutes,
    recentRuns: recentRuns.map(normalizeRun),
    scoreTrend: trend.map((r) => ({
      runId: r.id,
      date: r.createdAt,
      score: r.result?.overallScore ?? 0,
      stackName: r.stackVersion.stack.name,
      version: r.stackVersion.version,
    })),
  };
}

export async function leaderboard(orgId: string, scenarioId?: string) {
  const runs = await prisma.run.findMany({
    where: { orgId, result: { isNot: null }, ...(scenarioId ? { scenarioId } : {}) },
    include: { result: true, stackVersion: { include: { stack: true } }, scenario: true },
    orderBy: { createdAt: "desc" },
  });

  const bestByStackVersion = new Map<string, (typeof runs)[number]>();
  for (const run of runs) {
    const key = `${run.stackVersionId}:${run.scenarioId}`;
    const existing = bestByStackVersion.get(key);
    if (!existing || (run.result!.overallScore > existing.result!.overallScore)) {
      bestByStackVersion.set(key, run);
    }
  }

  return [...bestByStackVersion.values()]
    .sort((a, b) => b.result!.overallScore - a.result!.overallScore)
    .map((run, idx) => ({
      rank: idx + 1,
      runId: run.id,
      stackName: run.stackVersion.stack.name,
      version: run.stackVersion.version,
      scenarioName: run.scenario.name,
      score: run.result!.overallScore,
      passFail: run.result!.passFail,
      date: run.createdAt,
    }));
}

function normalizeRun(run: any) {
  return {
    ...run,
    scenario: {
      ...run.scenario,
      jammingProfile: parseJson<Record<string, unknown>>(run.scenario?.jammingProfile, {}),
      goalDefinition: parseJson<Record<string, unknown>>(run.scenario?.goalDefinition, {}),
      scoringWeights: parseJson<Record<string, number>>(run.scenario?.scoringWeights, {}),
      sensorSuite: parseJson<Record<string, unknown>>(run.scenario?.sensorSuite, {}),
    },
    stackVersion: {
      ...run.stackVersion,
      capabilities: parseJson<string[]>(run.stackVersion?.capabilities, []),
      paramOverrides: parseJson<Record<string, unknown> | null>(run.stackVersion?.paramOverrides, null),
      manifest: parseJson<Record<string, unknown> | null>(run.stackVersion?.manifest, null),
      runs: run.stackVersion?.runs?.map((versionRun: any) => ({
        ...versionRun,
        result: versionRun.result
          ? {
              ...versionRun.result,
              categoryScores: parseJson<Record<string, number>>(versionRun.result.categoryScores, {}),
              errorCodes: parseJson<string[]>(versionRun.result.errorCodes, []),
              artifactRefs: parseJson<Record<string, string>>(versionRun.result.artifactRefs, {}),
            }
          : versionRun.result,
      })),
    },
    result: run.result
      ? {
          ...run.result,
          categoryScores: parseJson<Record<string, number>>(run.result.categoryScores, {}),
          errorCodes: parseJson<string[]>(run.result.errorCodes, []),
          artifactRefs: parseJson<Record<string, string>>(run.result.artifactRefs, {}),
        }
      : run.result,
  };
}
