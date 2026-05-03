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

  it("routes low stock notifications through a safe provider adapter", async () => {
    const job = createJob("notifications.low-stock.dispatch", {
      organizationId: "org_kernel_guard",
      reason: "manual-test",
    });

    await expect(handleJob(job)).resolves.toMatchObject({
      channel: "SMS",
      mode: "dry-run",
      provider: "console",
      status: "notification-dispatched",
    });
  });

  it("routes webhook jobs with the durable event identity", async () => {
    const job = createJob("shopify.webhook.received", {
      webhookEventId: "wh_123",
      organizationId: "org_kernel_guard",
      source: "SHOPIFY",
      traceId: "trace_test_001",
      topic: "products/update",
    });

    await expect(handleJob(job)).resolves.toMatchObject({
      status: "webhook-event-ready-for-sync",
      jobId: job.id,
      webhookEventId: "wh_123",
      organizationId: "org_kernel_guard",
      source: "SHOPIFY",
      traceId: "trace_test_001",
      topic: "products/update",
    });
  });
});
