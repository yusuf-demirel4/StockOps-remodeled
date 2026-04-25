import type { JobName, QueueJob } from "./jobs";

export function createJob<TPayload>(
  name: JobName,
  payload: TPayload,
): QueueJob<TPayload> {
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
    case "woocommerce.webhook.received":
      return { status: "queued-for-sync", jobId: job.id };
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
