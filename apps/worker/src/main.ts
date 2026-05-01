import * as http from "node:http";
import { createLogger } from "@stockops/core/logger";
import { createQueueWorker } from "@stockops/queue";

import { workerMetricsRegistry } from "./metrics";
import { createJob, handleJob } from "./queue";

const logger = createLogger({ service: "stockops-worker" });

async function main() {
  const queueWorker = createQueueWorker(handleJob);
  const startupJob = createJob("inventory.reorder.evaluate", {
    reason: "worker-startup-check",
  });
  const result = await handleJob(startupJob);

  logger.info({
    status: "ready",
    startupCheck: result,
    queue: {
      driver: queueWorker.driver,
      mode: queueWorker.driver === "memory" ? "startup-check-only" : "listening",
      name: queueWorker.queueName,
    },
  }, "Worker started");

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
    await new Promise<void>((resolve) => metricsServer.close(() => resolve()));
    await queueWorker.close();
  });
}

void main();

function registerShutdown(close: () => Promise<void>) {
  const shutdown = async () => {
    logger.info("Shutting down worker");
    await close();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
