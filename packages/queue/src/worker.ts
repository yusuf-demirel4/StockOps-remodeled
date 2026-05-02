import type {
  JobName,
  JobPayloadByName,
  QueueJob,
} from "@stockops/core/jobs";

import {
  resolveQueueConfig,
  type QueueDriver,
  type QueueRuntimeConfig,
} from "./config";
import { Queue, Worker, type Job, type WorkerOptions } from "./bullmq";

type AnyJobPayload = JobPayloadByName[JobName];

export type QueueJobProcessor = (job: QueueJob) => Promise<unknown> | unknown;

export type QueueWorkerHandle = {
  close: () => Promise<void>;
  driver: QueueDriver;
  getQueueDepth: () => Promise<{
    active: number;
    delayed: number;
    waiting: number;
  }>;
  queueName: string;
};

export function createQueueWorker(
  processor: QueueJobProcessor,
  config: QueueRuntimeConfig = {},
): QueueWorkerHandle {
  const resolved = resolveQueueConfig(config);

  if (resolved.driver === "memory") {
    return {
      close: async () => {},
      driver: "memory",
      getQueueDepth: async () => ({ active: 0, delayed: 0, waiting: 0 }),
      queueName: resolved.queueName,
    };
  }

  const workerOptions: WorkerOptions = {
    concurrency: resolved.concurrency,
    connection: resolved.connection,
  };
  const queue = new Queue(resolved.queueName, {
    connection: resolved.connection,
  });
  const worker = new Worker(
    resolved.queueName,
    async (job) =>
      processor(toQueueJob(job as Job<AnyJobPayload, unknown, JobName>)),
    workerOptions,
  );

  worker.on("completed", (job) => {
    console.log(
      JSON.stringify({
        event: "queue.job.completed",
        jobId: job.id,
        name: job.name,
        queueName: resolved.queueName,
      }),
    );
  });
  worker.on("failed", (job, error) => {
    console.error(
      JSON.stringify({
        event: "queue.job.failed",
        error: error.message,
        jobId: job?.id,
        name: job?.name,
        queueName: resolved.queueName,
      }),
    );
  });
  worker.on("error", (error) => {
    console.error(
      JSON.stringify({
        event: "queue.worker.error",
        error: error.message,
        queueName: resolved.queueName,
      }),
    );
  });

  return {
    close: async () => {
      await worker.close();
      await queue.close();
    },
    driver: "bullmq",
    getQueueDepth: async () => {
      const counts = await queue.getJobCounts("waiting", "delayed", "active");
      return {
        active: counts.active ?? 0,
        delayed: counts.delayed ?? 0,
        waiting: counts.waiting ?? 0,
      };
    },
    queueName: resolved.queueName,
  };
}

function toQueueJob(job: Job<AnyJobPayload, unknown, JobName>): QueueJob {
  return {
    attempts: job.attemptsMade,
    createdAt: new Date(job.timestamp).toISOString(),
    id: String(job.id),
    name: job.name,
    payload: job.data,
  } as QueueJob;
}
