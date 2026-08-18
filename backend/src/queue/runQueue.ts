import { Queue, QueueEvents } from "bullmq";
import { createRedisConnection } from "../lib/redis";

export const RUN_QUEUE_NAME = "run-execution";

export const runQueue = new Queue(RUN_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

export const runQueueEvents = new QueueEvents(RUN_QUEUE_NAME, {
  connection: createRedisConnection(),
});

export interface RunJobData {
  runId: string;
}
