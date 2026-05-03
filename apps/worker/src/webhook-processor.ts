import type {
  QueueJob,
  WebhookReceivedJobName,
} from "@stockops/core/jobs";
import { extractExternalOrder } from "@stockops/core/webhooks";
import { getPrisma } from "@stockops/db";
import { publishJob } from "@stockops/queue";

const MAX_WEBHOOK_ATTEMPTS = 5;
const RETRY_DELAY_MS = 1000 * 60 * 5;

type DatabaseWebhookEvent = {
  headers: unknown;
  id: string;
  organizationId: string;
  payload: unknown;
};

export async function handleWebhookReceived(
  job: QueueJob<WebhookReceivedJobName>,
) {
  if (process.env.APP_DATA_SOURCE === "database") {
    return processDatabaseWebhook(job);
  }

  return {
    status: "webhook-event-ready-for-sync",
    jobId: job.id,
    webhookEventId: job.payload.webhookEventId,
    organizationId: job.payload.organizationId,
    source: job.payload.source,
    traceId: job.payload.traceId,
    topic: job.payload.topic,
  };
}

async function processDatabaseWebhook(job: QueueJob<WebhookReceivedJobName>) {
  const prisma = getPrisma();
  const event = await prisma.webhookEvent.findFirst({
    where: {
      id: job.payload.webhookEventId,
      organizationId: job.payload.organizationId,
    },
  });

  if (!event) {
    return {
      status: "webhook-event-not-found",
      jobId: job.id,
      webhookEventId: job.payload.webhookEventId,
    };
  }

  const nextAttempt = event.attempts + 1;
  const traceHeaders = mergeTraceHeader(event, job.payload.traceId);
  await prisma.webhookEvent.update({
    where: { id: event.id },
    data: {
      attempts: { increment: 1 },
      error: null,
      ...(traceHeaders ? { headers: traceHeaders } : {}),
      nextAttemptAt: null,
      status: "PROCESSING",
    },
  });

  try {
    return await importExternalOrder(job, event, nextAttempt);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook processing error.";
    const deadLetter = nextAttempt >= MAX_WEBHOOK_ATTEMPTS;
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: {
        error: message,
        nextAttemptAt: deadLetter
          ? null
          : new Date(Date.now() + RETRY_DELAY_MS),
        processedAt: new Date(),
        status: deadLetter ? "DEAD_LETTER" : "FAILED",
      },
    });

    return {
      status: deadLetter ? "webhook-event-dead-lettered" : "webhook-event-failed",
      jobId: job.id,
      reason: message,
      traceId: job.payload.traceId,
      webhookEventId: event.id,
    };
  }
}

async function importExternalOrder(
  job: QueueJob<WebhookReceivedJobName>,
  event: DatabaseWebhookEvent,
  attempt: number,
) {
  const prisma = getPrisma();
  const order = extractExternalOrder(
    job.payload.source,
    job.payload.topic,
    event.payload,
  );

  if (!order) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: {
        processedAt: new Date(),
        status: "IGNORED",
      },
    });

    return {
      status: "webhook-event-ignored",
      jobId: job.id,
      reason: "unsupported-topic",
      traceId: job.payload.traceId,
      topic: job.payload.topic,
      webhookEventId: event.id,
    };
  }

  const skus = [...new Set(order.lines.map((line) => line.sku).filter(Boolean))];
  const products = await prisma.product.findMany({
    where: {
      organizationId: event.organizationId,
      sku: { in: skus as string[] },
    },
  });
  const productBySku = new Map(products.map((product) => [product.sku, product]));
  const matchedLines = order.lines
    .map((line) => ({
      product: line.sku ? productBySku.get(line.sku) : undefined,
      quantity: line.quantity,
      sku: line.sku,
    }))
    .filter((line) => line.product);

  if (matchedLines.length === 0) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: {
        error: `No matching SKU for external order ${order.externalId}.`,
        nextAttemptAt:
          attempt >= MAX_WEBHOOK_ATTEMPTS
            ? null
            : new Date(Date.now() + RETRY_DELAY_MS),
        processedAt: new Date(),
        status: attempt >= MAX_WEBHOOK_ATTEMPTS ? "DEAD_LETTER" : "FAILED",
      },
    });

    return {
      status:
        attempt >= MAX_WEBHOOK_ATTEMPTS
          ? "webhook-event-dead-lettered"
          : "webhook-event-failed",
      jobId: job.id,
      reason: "no-matching-sku",
      traceId: job.payload.traceId,
      webhookEventId: event.id,
    };
  }

  const code = externalOrderCode(job.payload.source, order.externalId);
  const existing = await prisma.salesOrder.findFirst({
    where: { code, organizationId: event.organizationId },
  });

  if (!existing) {
    await prisma.$transaction(async (tx) => {
      const salesOrder = await tx.salesOrder.create({
        data: {
          code,
          customerName: order.customerName,
          organizationId: event.organizationId,
          lines: {
            create: matchedLines.map((line) => ({
              productId: line.product!.id,
              quantity: line.quantity,
            })),
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityId: salesOrder.id,
          entityType: "SalesOrder",
          organizationId: event.organizationId,
          summary: `${code} imported from ${job.payload.source.toLowerCase()}`,
        },
      });
      await tx.webhookEvent.update({
        where: { id: event.id },
        data: {
          error: null,
          processedAt: new Date(),
          status: "PROCESSED",
        },
      });
    });
  } else {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: {
        error: null,
        processedAt: new Date(),
        status: "PROCESSED",
      },
    });
  }

  await Promise.all([
    publishJob(
      "notifications.low-stock.dispatch",
      {
        organizationId: event.organizationId,
        reason: "external-order-imported",
        traceId: job.payload.traceId,
      },
      { attempts: 3, backoffMs: 5000 },
    ),
    publishJob(
      "integrations.stock-sync.dispatch",
      {
        organizationId: event.organizationId,
        reason: "external-order-imported",
        source: job.payload.source,
        traceId: job.payload.traceId,
      },
      { attempts: 3, backoffMs: 5000 },
    ),
  ]);

  return {
    code,
    lines: matchedLines.length,
    status: existing ? "webhook-event-already-imported" : "webhook-event-processed",
    jobId: job.id,
    traceId: job.payload.traceId,
    webhookEventId: event.id,
  };
}

function externalOrderCode(source: string, externalId: string) {
  const suffix = externalId
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/[^A-Za-z0-9_-]/g, "")
    .slice(-24);

  return `${source === "SHOPIFY" ? "SHP" : "WOO"}-${suffix || "ORDER"}`;
}

function mergeTraceHeader(event: DatabaseWebhookEvent, traceId: string | undefined) {
  if (!traceId) {
    return undefined;
  }

  return {
    ...(isRecord(event.headers) ? event.headers : {}),
    "x-stockops-trace-id": traceId,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
