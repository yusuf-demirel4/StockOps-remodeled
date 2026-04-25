import { createJob, handleJob } from "./queue";

async function main() {
  const startupJob = createJob("inventory.reorder.evaluate", {
    reason: "worker-startup-check",
  });
  const result = await handleJob(startupJob);

  console.log(
    JSON.stringify({
      service: "stockops-worker",
      status: "ready",
      startupCheck: result,
    }),
  );
}

void main();
