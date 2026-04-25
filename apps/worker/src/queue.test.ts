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
});
