import { redis, createRedisConnection } from "../lib/redis";
import { SimEvent } from "../simulation/simulationEngine";

function channelFor(runId: string): string {
  return `run:${runId}:events`;
}

export async function publishRunEvent(runId: string, event: SimEvent): Promise<void> {
  await redis.publish(channelFor(runId), JSON.stringify(event));
}

export interface RunSubscription {
  unsubscribe: () => Promise<void>;
}

/** Opens a dedicated subscriber connection (Redis requires a separate client while in subscribe mode). */
export function subscribeToRun(runId: string, handler: (event: SimEvent) => void): RunSubscription {
  const sub = createRedisConnection();
  const channel = channelFor(runId);

  sub.subscribe(channel).catch((err) => console.error("Redis subscribe failed:", err));
  sub.on("message", (ch, message) => {
    if (ch !== channel) return;
    try {
      handler(JSON.parse(message) as SimEvent);
    } catch (err) {
      console.error("Failed to parse run event:", err);
    }
  });

  return {
    unsubscribe: async () => {
      await sub.unsubscribe(channel);
      sub.disconnect();
    },
  };
}
