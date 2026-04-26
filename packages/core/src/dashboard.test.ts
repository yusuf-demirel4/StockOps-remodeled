import { describe, expect, it } from "vitest";
import { buildDashboardSummary, stockShortage } from "./dashboard";
import type { AppSnapshot } from "./types";

const snapshot = {
  products: [
    {
      id: "prd_keyboard",
      organizationId: "org_1",
      sku: "KBD-001",
      name: "Keyboard",
      category: "Accessory",
      minimumStock: 5,
      isActive: true,
    },
    {
      id: "prd_mouse",
      organizationId: "org_1",
      sku: "MOU-001",
      name: "Mouse",
      category: "Accessory",
      minimumStock: 10,
      isActive: true,
    },
  ],
  warehouses: [
    {
      id: "wh_main",
      organizationId: "org_1",
      code: "MAIN",
      name: "Main",
      isDefault: true,
    },
    {
      id: "wh_showroom",
      organizationId: "org_1",
      code: "SHOW",
      name: "Showroom",
      isDefault: false,
    },
  ],
  stockRows: [
    {
      product: {
        id: "prd_keyboard",
        organizationId: "org_1",
        sku: "KBD-001",
        name: "Keyboard",
        category: "Accessory",
        minimumStock: 5,
        isActive: true,
      },
      warehouse: {
        id: "wh_main",
        organizationId: "org_1",
        code: "MAIN",
        name: "Main",
        isDefault: true,
      },
      onHand: 8,
      minimumStock: 5,
      isCritical: false,
    },
    {
      product: {
        id: "prd_mouse",
        organizationId: "org_1",
        sku: "MOU-001",
        name: "Mouse",
        category: "Accessory",
        minimumStock: 10,
        isActive: true,
      },
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
      product: {
        id: "prd_mouse",
        organizationId: "org_1",
        sku: "MOU-001",
        name: "Mouse",
        category: "Accessory",
        minimumStock: 10,
        isActive: true,
      },
      warehouse: {
        id: "wh_showroom",
        organizationId: "org_1",
        code: "SHOW",
        name: "Showroom",
        isDefault: false,
      },
      onHand: 3,
      minimumStock: 10,
      isCritical: true,
    },
  ],
  stockMovements: [
    {
      id: "mov_1",
      organizationId: "org_1",
      warehouseId: "wh_main",
      productId: "prd_keyboard",
      type: "INBOUND",
      quantityChange: 8,
      createdAt: "2026-04-25T09:00:00.000Z",
    },
    {
      id: "mov_2",
      organizationId: "org_1",
      warehouseId: "wh_main",
      productId: "prd_mouse",
      type: "SALE",
      quantityChange: -6,
      createdAt: "2026-04-25T10:00:00.000Z",
    },
  ],
  openSalesOrders: [
    {
      id: "so_1",
      organizationId: "org_1",
      code: "SO-1",
      customerName: "Acme",
      status: "DRAFT",
      lines: [{ productId: "prd_mouse", quantity: 6 }],
      createdAt: "2026-04-25T11:00:00.000Z",
    },
  ],
  openPurchaseOrders: [
    {
      id: "po_1",
      organizationId: "org_1",
      supplierId: "sup_1",
      code: "PO-1",
      status: "SENT",
      lines: [
        { productId: "prd_mouse", quantity: 12, receivedQuantity: 3 },
      ],
      createdAt: "2026-04-25T12:00:00.000Z",
    },
  ],
} satisfies Pick<
  AppSnapshot,
  | "products"
  | "warehouses"
  | "stockRows"
  | "stockMovements"
  | "openSalesOrders"
  | "openPurchaseOrders"
>;

describe("buildDashboardSummary", () => {
  it("summarizes inventory health and order workload", () => {
    const summary = buildDashboardSummary(snapshot);

    expect(summary.activeProductCount).toBe(2);
    expect(summary.totalOnHand).toBe(15);
    expect(summary.criticalStockRowCount).toBe(2);
    expect(summary.criticalProductCount).toBe(1);
    expect(summary.stockHealthPercent).toBe(33);
    expect(summary.openSalesUnits).toBe(6);
    expect(summary.pendingPurchaseUnits).toBe(9);
    expect(summary.readySalesOrderCount).toBe(0);
    expect(summary.blockedSalesOrderCount).toBe(1);
    expect(summary.salesOrderReadiness[0].blockedLines).toEqual([
      {
        availableQuantity: 4,
        productId: "prd_mouse",
        requiredQuantity: 6,
      },
    ]);
  });

  it("orders critical rows by shortage and ranks moving products", () => {
    const summary = buildDashboardSummary(snapshot);

    expect(summary.criticalRows.map((row) => row.warehouse.id)).toEqual([
      "wh_showroom",
      "wh_main",
    ]);
    expect(stockShortage(summary.criticalRows[0])).toBe(7);
    expect(summary.topMovingProducts.map((item) => item.product.sku)).toEqual([
      "KBD-001",
      "MOU-001",
    ]);
  });
});
