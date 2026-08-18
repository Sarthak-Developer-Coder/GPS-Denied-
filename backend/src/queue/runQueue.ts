import { Queue, QueueEvents, JobsOptions } from "bullmq";
import { createRedisConnection } from "../lib/redis";

export const RUN_QUEUE_NAME = "run-execution";

let queue: Queue | null = null;
let queueEvents: QueueEvents | null = null;

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(RUN_QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    });
  }
  return queue;
}

export async function enqueueRun(runId: string, options?: JobsOptions) {
  try {
    return await getQueue().add("execute-run", { runId }, { jobId: runId, ...options });
  } catch (error) {
    console.warn("BullMQ unavailable, falling back to direct run execution:", error);
    return null;
  }
}

export function getRunQueueEvents(): QueueEvents | null {
  if (!queueEvents) {
    try {
      queueEvents = new QueueEvents(RUN_QUEUE_NAME, {
        connection: createRedisConnection(),
      });
    } catch (error) {
      console.warn("BullMQ queue events unavailable:", error);
      return null;
    }
  }
  return queueEvents;
}

export interface RunJobData {
  runId: string;
}
