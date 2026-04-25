import { beforeEach, describe, expect, it } from "vitest";

import {
  clearMemoryQueueJobs,
  createQueuePublisher,
  getMemoryQueueJobs,
} from "./publisher";

describe("queue publisher", () => {
  beforeEach(() => {
    clearMemoryQueueJobs();
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
});
