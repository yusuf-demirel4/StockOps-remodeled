import { createLogger } from "@stockops/core/logger";
import { createQueueWorker } from "@stockops/queue";

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

  registerShutdown(queueWorker.close);
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
