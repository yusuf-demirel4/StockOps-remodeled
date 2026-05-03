import * as http from "node:http";
import { createLogger } from "@stockops/core/logger";
import type { QueueJob } from "@stockops/core/jobs";
import { createQueueWorker, resolveQueueConfig } from "@stockops/queue";

import {
  jobProcessedTotal,
  jobProcessingDuration,
  queueDepth,
  syncFailuresTotal,
  workerMetricsRegistry,
} from "./metrics";
import { createJob, handleJob } from "./queue";

const logger = createLogger({ service: "stockops-worker" });

async function main() {
  validateWorkerEnvironment();

  const queueWorker = createQueueWorker(handleObservedJob);
  const startupJob = createJob("inventory.reorder.evaluate", {
    reason: "worker-startup-check",
  });
  const result = await handleObservedJob(startupJob);

  logger.info({
    status: "ready",
    startupCheck: result,
    queue: {
      driver: queueWorker.driver,
      mode: queueWorker.driver === "memory" ? "startup-check-only" : "listening",
      name: queueWorker.queueName,
    },
  }, "Worker started");

  const refreshQueueDepth = async () => {
    try {
      const counts = await queueWorker.getQueueDepth();
      for (const [status, value] of Object.entries(counts)) {
        queueDepth.set({ queue_name: queueWorker.queueName, status }, value);
      }
    } catch (err) {
      logger.warn({
        error: (err as Error).message,
        queueName: queueWorker.queueName,
      }, "Unable to refresh worker queue depth metric");
    }
  };
  await refreshQueueDepth();
  const queueDepthInterval = setInterval(
    () => void refreshQueueDepth(),
    Number(process.env.WORKER_METRICS_REFRESH_MS ?? 15000),
  );

  const metricsPort = process.env.WORKER_METRICS_PORT ? parseInt(process.env.WORKER_METRICS_PORT) : 4001;
  const metricsServer = http.createServer(async (req, res) => {
    if (req.url === "/metrics" && req.method === "GET") {
      res.setHeader("Content-Type", workerMetricsRegistry.contentType);
      const metrics = await workerMetricsRegistry.metrics();
      res.end(metrics);
    } else {
      res.statusCode = 404;
      res.end("Not Found");
    }
  });

  metricsServer.listen(metricsPort, "0.0.0.0", () => {
    logger.info({ port: metricsPort }, "Worker metrics server started");
  });

  registerShutdown(async () => {
    clearInterval(queueDepthInterval);
    await new Promise<void>((resolve) => metricsServer.close(() => resolve()));
    await queueWorker.close();
  });
}

void main().catch((error) => {
  logger.error({
    error: error instanceof Error ? error.message : String(error),
  }, "Worker failed to start");
  process.exit(1);
});

async function handleObservedJob(job: QueueJob) {
  const stopTimer = jobProcessingDuration.startTimer({ job_name: job.name });

  try {
    const result = await handleJob(job);
    jobProcessedTotal.inc({ job_name: job.name, status: "success" });
    logger.info({
      jobId: job.id,
      name: job.name,
      result,
      traceId: traceIdForJob(job),
    }, "Job processed");
    return result;
  } catch (err) {
    jobProcessedTotal.inc({ job_name: job.name, status: "failed" });
    if (job.name.includes("sync") || job.name.includes("webhook")) {
      syncFailuresTotal.inc({
        entity_type: entityTypeLabelForJob(job.name),
        integration: integrationLabelForJob(job.name),
      });
    }
    logger.error({
      error: err instanceof Error ? err.message : String(err),
      jobId: job.id,
      name: job.name,
      traceId: traceIdForJob(job),
    }, "Job failed");
    throw err;
  } finally {
    stopTimer();
  }
}

function traceIdForJob(job: QueueJob) {
  const payload = job.payload as { traceId?: unknown };
  return typeof payload.traceId === "string" ? payload.traceId : undefined;
}

function integrationLabelForJob(jobName: string) {
  if (jobName.includes("shopify")) {
    return "shopify";
  }
  if (jobName.includes("woocommerce")) {
    return "woocommerce";
  }
  if (jobName.includes("xero")) {
    return "xero";
  }
  if (jobName.includes("quickbooks")) {
    return "quickbooks";
  }
  return "stockops";
}

function entityTypeLabelForJob(jobName: string) {
  if (jobName.includes("invoice")) {
    return "invoice";
  }
  if (jobName.includes("payment")) {
    return "payment";
  }
  if (jobName.includes("product")) {
    return "product";
  }
  if (jobName.includes("stock")) {
    return "stock";
  }
  if (jobName.includes("webhook")) {
    return "webhook";
  }
  return "job";
}

function registerShutdown(close: () => Promise<void>) {
  const shutdown = async () => {
    logger.info("Shutting down worker");
    await close();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

function validateWorkerEnvironment() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (process.env.APP_DATA_SOURCE !== "database") {
    throw new Error("Production worker requires APP_DATA_SOURCE=database.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the production worker.");
  }

  const queue = resolveQueueConfig();
  if (queue.driver !== "bullmq") {
    throw new Error("Production worker requires STOCKOPS_QUEUE_DRIVER=bullmq.");
  }
}
