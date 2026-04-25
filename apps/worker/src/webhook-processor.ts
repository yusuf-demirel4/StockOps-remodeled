import type {
  QueueJob,
  WebhookReceivedJobName,
} from "@stockops/core/jobs";

export async function handleWebhookReceived(
  job: QueueJob<WebhookReceivedJobName>,
) {
  return {
    status: "webhook-event-ready-for-sync",
    jobId: job.id,
    webhookEventId: job.payload.webhookEventId,
    organizationId: job.payload.organizationId,
    source: job.payload.source,
    topic: job.payload.topic,
  };
}
