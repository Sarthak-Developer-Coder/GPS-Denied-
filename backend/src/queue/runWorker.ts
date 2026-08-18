import fs from "fs";
import path from "path";
import { Worker, Job } from "bullmq";
import { createRedisConnection } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { RUN_QUEUE_NAME, RunJobData } from "./runQueue";
import { publishRunEvent } from "../websocket/pubsub";
import { SimulationEngine, EngineScenario, EngineStackVersion, SimEvent } from "../simulation/simulationEngine";
import { isCancelled, clearCancellation } from "./cancellationRegistry";
import { fireRunCompletedWebhooks } from "../services/webhook.service";
import { parseJson, stringifyJson } from "../utils/json";

const ARTIFACTS_ROOT = path.join(__dirname, "..", "..", "artifacts");

async function processRunJob(job: Job<RunJobData>): Promise<void> {
  const { runId } = job.data;

  const run = await prisma.run.findUniqueOrThrow({
    where: { id: runId },
    include: { scenario: true, stackVersion: true },
  });

  if (isCancelled(runId)) {
    await prisma.run.update({ where: { id: runId }, data: { status: "CANCELLED", endedAt: new Date() } });
    clearCancellation(runId);
    return;
  }

  const artifactsDir = path.join(ARTIFACTS_ROOT, runId);
  fs.mkdirSync(artifactsDir, { recursive: true });
  const logLines: string[] = [];
  const timeline: SimEvent[] = [];

  await prisma.run.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: new Date(), workerPodId: `sim-worker-${process.pid}-${runId.slice(0, 8)}` },
  });
  await publishRunEvent(runId, {
    type: "log",
    timestampSim: 0,
    eventType: "run_started",
    severity: "info",
    message: `Run started against scenario ${run.scenario.name}`,
  });

  const engineScenario: EngineScenario = {
    key: run.scenario.key,
    durationSec: run.scenario.durationSec,
    jammingProfile: parseJson(run.scenario.jammingProfile, {} as any),
    goalDefinition: parseJson(run.scenario.goalDefinition, {} as any),
    scoringWeights: parseJson(run.scenario.scoringWeights, {} as any),
  };
  const engineStackVersion: EngineStackVersion = {
    submissionType: run.stackVersion.submissionType,
    paramOverrides: parseJson(run.stackVersion.paramOverrides, null),
    cmdVelType: run.stackVersion.cmdVelType,
  };

  let eventBuffer: { runId: string; timestampSim: number; eventType: string; payload: string; severity: string }[] = [];
  const flush = async () => {
    if (eventBuffer.length === 0) return;
    const batch = eventBuffer;
    eventBuffer = [];
    await prisma.runEvent.createMany({ data: batch });
  };

  const engine = new SimulationEngine(run.seed, engineScenario, engineStackVersion, (evt: SimEvent) => {
    timeline.push(evt);
    publishRunEvent(runId, evt).catch((e) => console.error("publish failed", e));

    if (evt.type === "log") {
      logLines.push(`[t+${evt.timestampSim.toFixed(1)}s] [${evt.severity.toUpperCase()}] ${evt.eventType}: ${evt.message}`);
      eventBuffer.push({
        runId,
        timestampSim: evt.timestampSim,
        eventType: evt.eventType,
        payload: stringifyJson(evt.payload ?? {}),
        severity: evt.severity,
      });
    } else {
      eventBuffer.push({
        runId,
        timestampSim: evt.timestampSim,
        eventType: "telemetry",
        payload: stringifyJson(evt.payload),
        severity: "info",
      });
    }
    if (eventBuffer.length >= 20) flush().catch((e) => console.error("flush failed", e));
  });

  const signal = { cancelled: false };
  const cancelPoll = setInterval(() => {
    if (isCancelled(runId)) signal.cancelled = true;
  }, 500);

  let result;
  try {
    result = await engine.execute(signal);
  } finally {
    clearInterval(cancelPoll);
    await flush();
  }

  fs.writeFileSync(path.join(artifactsDir, "log.txt"), logLines.join("\n"), "utf-8");
  fs.writeFileSync(
    path.join(artifactsDir, "summary.json"),
    JSON.stringify({ run: runId, seed: run.seed, result, timelineCount: timeline.length }, null, 2)
  );
  fs.writeFileSync(
    path.join(artifactsDir, "map.json"),
    JSON.stringify({ note: "Synthetic occupancy grid placeholder", coveragePct: result.stats.mapCoveragePct }, null, 2)
  );
  fs.writeFileSync(
    path.join(artifactsDir, "trajectory.json"),
    JSON.stringify({ note: "Synthetic trajectory placeholder", points: timeline.filter((e) => e.type === "telemetry").map((e: any) => e.payload.pose) })
  );

  if (isCancelled(runId)) {
    await prisma.run.update({ where: { id: runId }, data: { status: "CANCELLED", endedAt: new Date() } });
    clearCancellation(runId);
    return;
  }

  const finalStatus = result.passFail ? "PASSED" : "FAILED";

  await prisma.$transaction([
    prisma.runResult.create({
      data: {
        runId,
        overallScore: result.overallScore,
        passFail: result.passFail,
        categoryScores: stringifyJson(result.categoryScores),
        errorCodes: stringifyJson(result.errorCodes),
        artifactRefs: stringifyJson({
          log: `/v1/runs/${runId}/artifacts/log.txt`,
          summary: `/v1/runs/${runId}/artifacts/summary.json`,
          map: `/v1/runs/${runId}/artifacts/map.json`,
          trajectory: `/v1/runs/${runId}/artifacts/trajectory.json`,
        }),
      },
    }),
    prisma.run.update({ where: { id: runId }, data: { status: finalStatus, endedAt: new Date() } }),
    prisma.org.update({
      where: { id: run.orgId },
      data: { usedSimMinutes: { increment: Math.ceil(run.scenario.durationSec / 60) } },
    }),
  ]);

  await publishRunEvent(runId, {
    type: "log",
    timestampSim: run.scenario.durationSec,
    eventType: "run_completed",
    severity: "info",
    message: `Run completed with status ${finalStatus} (score ${result.overallScore})`,
  });

  await fireRunCompletedWebhooks(run.orgId, {
    runId,
    status: finalStatus,
    overallScore: result.overallScore,
    scenarioId: run.scenarioId,
    stackVersionId: run.stackVersionId,
  });
}

export function startRunWorker(): Worker<RunJobData> {
  try {
    const worker = new Worker<RunJobData>(
      RUN_QUEUE_NAME,
      async (job) => {
        await processRunJob(job);
      },
      { connection: createRedisConnection(), concurrency: 5 }
    );

    worker.on("failed", async (job, err) => {
      console.error(`Run job ${job?.id} failed:`, err);
      if (job?.data.runId) {
        await prisma.run
          .update({ where: { id: job.data.runId }, data: { status: "ERROR", endedAt: new Date() } })
          .catch(() => undefined);
        await publishRunEvent(job.data.runId, {
          type: "log",
          timestampSim: 0,
          eventType: "infra_error",
          severity: "critical",
          message: `Infrastructure error: ${err.message}`,
        }).catch(() => undefined);
      }
    });

    return worker;
  } catch (error) {
    console.warn("Run worker disabled because BullMQ/Redis is unavailable:", error);
    return null as unknown as Worker<RunJobData>;
  }
}
