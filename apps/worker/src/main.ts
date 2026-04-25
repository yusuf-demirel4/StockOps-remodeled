import { createQueueWorker } from "@stockops/queue";

import { createJob, handleJob } from "./queue";

async function main() {
  const queueWorker = createQueueWorker(handleJob);
  const startupJob = createJob("inventory.reorder.evaluate", {
    reason: "worker-startup-check",
  });
  const result = await handleJob(startupJob);

  console.log(
    JSON.stringify({
      service: "stockops-worker",
      status: "ready",
      startupCheck: result,
      queue: {
        driver: queueWorker.driver,
        mode: queueWorker.driver === "memory" ? "startup-check-only" : "listening",
        name: queueWorker.queueName,
      },
    }),
  );

  registerShutdown(queueWorker.close);
}

void main();

function registerShutdown(close: () => Promise<void>) {
  const shutdown = async () => {
    await close();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
