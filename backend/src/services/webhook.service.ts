import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { parseJson } from "../utils/json";

export async function fireRunCompletedWebhooks(orgId: string, payload: Record<string, unknown>): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: { orgId, active: true },
  });

  await Promise.allSettled(
    webhooks
      .filter((hook) => parseJson<string[]>(hook.events, []).includes("run.completed"))
      .map(async (hook) => {
      const body = JSON.stringify({ event: "run.completed", data: payload, sentAt: new Date().toISOString() });
      const signature = crypto.createHmac("sha256", hook.secret).update(body).digest("hex");
      try {
        await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-SpaceBorn-Signature": signature,
          },
          body,
        });
      } catch (err) {
        console.error(`Webhook delivery failed for ${hook.url}:`, err);
      }
      })
  );
}
