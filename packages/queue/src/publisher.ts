import type {
  JobName,
  JobPayloadByName,
  QueueJob,
} from "@stockops/core/jobs";
import { Queue } from "bullmq";

import {
  resolveQueueConfig,
  type QueueDriver,
  type QueueRuntimeConfig,
} from "./config";

type AnyJobPayload = JobPayloadByName[JobName];

export type QueuePublishOptions = {
  attempts?: number;
  backoffMs?: number;
  delayMs?: number;
  jobId?: string;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
};

export type QueuePublishResult<TName extends JobName = JobName> = {
  createdAt: string;
  driver: QueueDriver;
  jobId: string;
  name: TName;
  payload: JobPayloadByName[TName];
  queueName: string;
  queued: true;
};

const globalForMemoryQueue = globalThis as typeof globalThis & {
  stockOpsMemoryQueueJobs?: QueueJob[];
};

export class StockOpsQueuePublisher {
  private readonly driver: QueueDriver;
  private readonly queue?: Queue;
  private readonly queueName: string;

  constructor(config: QueueRuntimeConfig = {}) {
    const resolved = resolveQueueConfig(config);
    this.driver = resolved.driver;
    this.queueName = resolved.queueName;

    if (resolved.driver === "bullmq") {
      this.queue = new Queue(resolved.queueName, {
        connection: resolved.connection,
      });
    }
  }

  async publish<TName extends JobName>(
    name: TName,
    payload: JobPayloadByName[TName],
    options: QueuePublishOptions = {},
  ): Promise<QueuePublishResult<TName>> {
    if (this.driver === "memory") {
      return publishMemoryJob(this.queueName, name, payload, options);
    }

    const job = await this.queue!.add(name, payload as AnyJobPayload, {
      attempts: options.attempts ?? 3,
      backoff:
        options.backoffMs === undefined
          ? undefined
          : { delay: options.backoffMs, type: "exponential" },
      delay: options.delayMs,
      jobId: options.jobId,
      removeOnComplete: options.removeOnComplete ?? 1000,
      removeOnFail: options.removeOnFail ?? 5000,
    });

    return {
      createdAt: new Date(job.timestamp).toISOString(),
      driver: this.driver,
      jobId: String(job.id),
      name,
      payload,
      queueName: this.queueName,
      queued: true,
    };
  }

  async close() {
    await this.queue?.close();
  }
}

export function createQueuePublisher(config: QueueRuntimeConfig = {}) {
  return new StockOpsQueuePublisher(config);
}

let sharedPublisher: StockOpsQueuePublisher | undefined;

export function getQueuePublisher() {
  sharedPublisher ??= createQueuePublisher();
  return sharedPublisher;
}

export function resetQueuePublisherForTests() {
  sharedPublisher = undefined;
}

export async function publishJob<TName extends JobName>(
  name: TName,
  payload: JobPayloadByName[TName],
  options: QueuePublishOptions = {},
) {
  return getQueuePublisher().publish(name, payload, options);
}

export function getMemoryQueueJobs() {
  return [...(globalForMemoryQueue.stockOpsMemoryQueueJobs ?? [])];
}

export function clearMemoryQueueJobs() {
  globalForMemoryQueue.stockOpsMemoryQueueJobs = [];
}

function publishMemoryJob<TName extends JobName>(
  queueName: string,
  name: TName,
  payload: JobPayloadByName[TName],
  options: QueuePublishOptions,
): QueuePublishResult<TName> {
  globalForMemoryQueue.stockOpsMemoryQueueJobs ??= [];

  const createdAt = new Date().toISOString();
  const job: QueueJob<TName> = {
    attempts: 0,
    createdAt,
    id: options.jobId ?? `job_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    payload,
  };

  globalForMemoryQueue.stockOpsMemoryQueueJobs.push(job as QueueJob);

  return {
    createdAt,
    driver: "memory",
    jobId: job.id,
    name,
    payload,
    queueName,
    queued: true,
  };
}
