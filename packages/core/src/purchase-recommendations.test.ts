import { describe, expect, it } from "vitest";
import { buildPurchaseRecommendations } from "./purchase-recommendations";
import type { AppSnapshot } from "./types";

const mouse = {
  id: "prd_mouse",
  organizationId: "org_1",
  sku: "MOU-001",
  name: "Mouse",
  category: "Accessory",
  minimumStock: 10,
  isActive: true,
        unitPrice: 0,
};

const keyboard = {
  id: "prd_keyboard",
  organizationId: "org_1",
  sku: "KBD-001",
  name: "Keyboard",
  category: "Accessory",
  minimumStock: 5,
  isActive: true,
        unitPrice: 0,
};

const snapshot = {
  products: [mouse, keyboard],
  suppliers: [
    {
      id: "sup_mouse",
      organizationId: "org_1",
      name: "Mouse Supply",
      leadTimeDays: 6,
      productIds: ["prd_mouse"],
    },
  ],
  stockRows: [
    {
      product: mouse,
      warehouse: {
        id: "wh_main",
        organizationId: "org_1",
        code: "MAIN",
        name: "Main",
        isDefault: true,
      },
      onHand: 4,
      minimumStock: 10,
      isCritical: true,
    },
    {
      product: keyboard,
      warehouse: {
        id: "wh_main",
        organizationId: "org_1",
        code: "MAIN",
        name: "Main",
        isDefault: true,
      },
      onHand: 20,
      minimumStock: 5,
      isCritical: false,
    },
  ],
  openSalesOrders: [
    {
      id: "so_1",
      organizationId: "org_1",
      code: "SO-1",
      customerName: "Acme",
      status: "DRAFT",
      lines: [{ productId: "prd_mouse", quantity: 3 }],
      createdAt: "2026-04-25T09:00:00.000Z",
    },
  ],
  openPurchaseOrders: [
    {
      id: "po_1",
      organizationId: "org_1",
      supplierId: "sup_mouse",
      code: "PO-1",
      status: "SENT",
      lines: [
        { productId: "prd_mouse", quantity: 4, receivedQuantity: 1 },
      ],
      createdAt: "2026-04-25T10:00:00.000Z",
    },
  ],
} satisfies Pick<
  AppSnapshot,
  | "products"
  | "suppliers"
  | "stockRows"
  | "openSalesOrders"
  | "openPurchaseOrders"
>;

describe("buildPurchaseRecommendations", () => {
  it("recommends replenishment from projected availability", () => {
    const recommendations = buildPurchaseRecommendations(snapshot);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({
      onHand: 4,
      openSalesDemand: 3,
      pendingInbound: 3,
      projectedAvailable: 4,
      suggestedQuantity: 16,
      urgency: "warning",
    });
    expect(recommendations[0].supplier?.id).toBe("sup_mouse");
  });
});
