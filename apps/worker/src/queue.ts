import type { JobName, QueueJob } from "@stockops/core/jobs";
import {
  handleLowStockNotificationDispatch,
  handleOrderStatusNotificationDispatch,
} from "./notification-dispatcher";
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
      return handleLowStockNotificationDispatch(
        job as QueueJob<"notifications.low-stock.dispatch">,
      );
    case "notifications.order-status.dispatch":
      return handleOrderStatusNotificationDispatch(
        job as QueueJob<"notifications.order-status.dispatch">,
      );
    case "integrations.stock-sync.dispatch":
      return { status: "stock-sync-dispatch-ready", jobId: job.id };
    default: {
      const exhaustive: never = job.name;
      return exhaustive;
    }
  }
}
