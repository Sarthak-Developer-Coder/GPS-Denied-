import IORedis from "ioredis";
import { env } from "../config/env";

// shared connection options for BullMQ (must set maxRetriesPerRequest: null)
export function createRedisConnection() {
  return new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
  });
}

export const redis = createRedisConnection();
