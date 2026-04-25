import { describe, expect, it } from "vitest";

import { createJob, handleJob } from "./queue";

describe("worker queue", () => {
  it("creates typed jobs and routes them to a handler", async () => {
    const job = createJob("inventory.reorder.evaluate", {
      productId: "prd_monitor_27",
    });

    await expect(handleJob(job)).resolves.toEqual({
      status: "reorder-evaluated",
      jobId: job.id,
    });
  });

  it("routes webhook jobs with the durable event identity", async () => {
    const job = createJob("shopify.webhook.received", {
      webhookEventId: "wh_123",
      organizationId: "org_kernel_guard",
      source: "SHOPIFY",
      topic: "products/update",
    });

    await expect(handleJob(job)).resolves.toMatchObject({
      status: "webhook-event-ready-for-sync",
      jobId: job.id,
      webhookEventId: "wh_123",
      organizationId: "org_kernel_guard",
      source: "SHOPIFY",
      topic: "products/update",
    });
  });
});
