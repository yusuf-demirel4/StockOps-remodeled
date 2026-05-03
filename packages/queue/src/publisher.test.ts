import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearMemoryQueueJobs,
  createQueuePublisher,
  getMemoryQueueJobs,
} from "./publisher";
import { resolveQueueConfig } from "./config";

describe("queue publisher", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    clearMemoryQueueJobs();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("publishes jobs to the memory queue", async () => {
    const publisher = createQueuePublisher({
      driver: "memory",
      queueName: "stockops.test",
    });

    const result = await publisher.publish(
      "inventory.reorder.evaluate",
      { reason: "unit-test" },
      { jobId: "job_test_001" },
    );

    expect(result).toMatchObject({
      driver: "memory",
      jobId: "job_test_001",
      name: "inventory.reorder.evaluate",
      queueName: "stockops.test",
      queued: true,
    });
    expect(getMemoryQueueJobs()).toHaveLength(1);
    expect(getMemoryQueueJobs()[0]).toMatchObject({
      id: "job_test_001",
      payload: { reason: "unit-test" },
    });
  });

  it("refuses memory queue fallback in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.REDIS_URL;
    delete process.env.UPSTASH_REDIS_URL;
    delete process.env.STOCKOPS_QUEUE_DRIVER;

    expect(() => resolveQueueConfig()).toThrow(/memory queue in production/);

    process.env.STOCKOPS_QUEUE_DRIVER = "bullmq";
    expect(() => resolveQueueConfig()).toThrow(/REDIS_URL/);

    process.env.REDIS_URL = "redis://localhost:6379";
    expect(resolveQueueConfig()).toMatchObject({
      driver: "bullmq",
      redisUrl: "redis://localhost:6379",
    });
  });
});
