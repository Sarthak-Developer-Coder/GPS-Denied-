import IORedis from "ioredis";
import { env } from "../config/env";

// shared connection options for BullMQ (must set maxRetriesPerRequest: null)
export function createRedisConnection() {
  return new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
  });
}

export const redis = createRedisConnection();

export async function isBullmqCompatibleRedis(): Promise<boolean> {
  try {
    const probe = new IORedis(env.redisUrl);
    const info = await probe.info("server");
    await probe.quit();
    const match = info.match(/redis_version:(\d+)\.(\d+)\.(\d+)/i);
    if (!match) return false;
    const major = Number(match[1]);
    return major >= 5;
  } catch {
    return false;
  }
}
