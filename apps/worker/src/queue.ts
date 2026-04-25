import type { JobName, QueueJob } from "@stockops/core/jobs";
import { handleWebhookReceived } from "./webhook-processor";

export function createJob<TName extends JobName>(
  name: TName,
  payload: QueueJob<TName>["payload"],
): QueueJob<TName> {
  return {
    id: `job_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    payload,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
}

export async function handleJob(job: QueueJob) {
  switch (job.name) {
    case "shopify.webhook.received":
      return handleWebhookReceived(job as QueueJob<"shopify.webhook.received">);
    case "woocommerce.webhook.received":
      return handleWebhookReceived(
        job as QueueJob<"woocommerce.webhook.received">,
      );
    case "inventory.reorder.evaluate":
      return { status: "reorder-evaluated", jobId: job.id };
    case "notifications.low-stock.dispatch":
      return { status: "notification-dispatched", jobId: job.id };
    case "forecast.demand.refresh":
      return { status: "forecast-refresh-scheduled", jobId: job.id };
    default: {
      const exhaustive: never = job.name;
      return exhaustive;
    }
  }
}
