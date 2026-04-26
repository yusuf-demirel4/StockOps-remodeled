import { describe, expect, it } from "vitest";
import { createLowStockNotificationDrafts } from "./notifications";
import type { StockRow } from "./types";

const row: StockRow = {
  isCritical: true,
  minimumStock: 8,
  onHand: 3,
  product: {
    category: "Display",
    id: "prd_monitor_27",
    isActive: true,
    minimumStock: 8,
    name: "27 inch Monitor",
    organizationId: "org_kernel_guard",
    sku: "MON-27-4K",
  },
  warehouse: {
    code: "MAIN",
    id: "wh_main",
    isDefault: true,
    name: "Main Warehouse",
    organizationId: "org_kernel_guard",
  },
};

describe("notifications", () => {
  it("creates low-stock delivery drafts and skips missing recipients", () => {
    expect(
      createLowStockNotificationDrafts([row], "org_kernel_guard", {
        channel: "SMS",
        provider: "console",
        recipient: "+15550000000",
      }),
    ).toEqual([
      expect.objectContaining({
        channel: "SMS",
        message: expect.stringContaining("MON-27-4K"),
        provider: "console",
        recipient: "+15550000000",
        status: "PENDING",
      }),
    ]);

    expect(
      createLowStockNotificationDrafts([row], "org_kernel_guard", {
        channel: "WHATSAPP",
      }),
    ).toEqual([
      expect.objectContaining({
        channel: "WHATSAPP",
        reason: "missing-recipient",
        status: "SKIPPED",
      }),
    ]);
  });
});
