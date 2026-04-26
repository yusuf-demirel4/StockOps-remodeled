import { describe, expect, it } from "vitest";
import {
  recalculateWAC,
  computeWACCogs,
  calculateFIFOCost,
  createLayerFromReceipt,
  type InventoryLayer,
} from "./costing";

describe("WAC — Weighted Average Cost", () => {
  it("calculates WAC for initial receipt", () => {
    const wac = recalculateWAC(0, 0, 100, 10);
    expect(wac).toBe(10);
  });

  it("recalculates WAC after second receipt at different price", () => {
    // 100 units at 10, then 50 units at 16
    // Expected: (100*10 + 50*16) / 150 = 1800/150 = 12
    const wac = recalculateWAC(100, 10, 50, 16);
    expect(wac).toBe(12);
  });

  it("returns 0 when total quantity is 0", () => {
    expect(recalculateWAC(0, 0, 0, 0)).toBe(0);
  });

  it("generates COGS entry from WAC", () => {
    const entry = computeWACCogs(10, 12.5, "mov_1", "org_1", "prd_1");
    expect(entry.quantity).toBe(10);
    expect(entry.unitCost).toBe(12.5);
    expect(entry.totalCost).toBe(125);
    expect(entry.method).toBe("WAC");
  });
});

describe("FIFO — First In First Out", () => {
  const baseLayers: InventoryLayer[] = [
    {
      id: "layer_1",
      organizationId: "org_1",
      productId: "prd_1",
      warehouseId: "wh_1",
      quantity: 50,
      unitCost: 10,
      receivedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "layer_2",
      organizationId: "org_1",
      productId: "prd_1",
      warehouseId: "wh_1",
      quantity: 30,
      unitCost: 15,
      receivedAt: "2026-02-01T00:00:00Z",
    },
    {
      id: "layer_3",
      organizationId: "org_1",
      productId: "prd_1",
      warehouseId: "wh_1",
      quantity: 20,
      unitCost: 20,
      receivedAt: "2026-03-01T00:00:00Z",
    },
  ];

  it("depletes oldest layer first", () => {
    const result = calculateFIFOCost(baseLayers, 30, "mov_1", "org_1", "prd_1");

    // Takes 30 from layer_1 (cost 10 each) → COGS = 300
    expect(result.cogs.totalCost).toBe(300);
    expect(result.cogs.unitCost).toBe(10);
    expect(result.depletedLayers).toEqual([{ layerId: "layer_1", quantityUsed: 30 }]);
    // layer_1 has 20 remaining
    expect(result.remainingLayers[0].quantity).toBe(20);
    expect(result.remainingLayers.length).toBe(3);
  });

  it("spans multiple layers", () => {
    // Take 60: 50 from layer_1 at 10, 10 from layer_2 at 15
    const result = calculateFIFOCost(baseLayers, 60, "mov_2", "org_1", "prd_1");

    // COGS = 50*10 + 10*15 = 500 + 150 = 650
    expect(result.cogs.totalCost).toBe(650);
    expect(result.cogs.unitCost).toBeCloseTo(650 / 60, 4);
    expect(result.depletedLayers).toEqual([
      { layerId: "layer_1", quantityUsed: 50 },
      { layerId: "layer_2", quantityUsed: 10 },
    ]);
    // layer_1 fully depleted, layer_2 has 20 remaining
    expect(result.remainingLayers.length).toBe(2);
    expect(result.remainingLayers[0].id).toBe("layer_2");
    expect(result.remainingLayers[0].quantity).toBe(20);
  });

  it("throws on insufficient quantity", () => {
    expect(() =>
      calculateFIFOCost(baseLayers, 200, "mov_3", "org_1", "prd_1"),
    ).toThrow("Insufficient inventory layers");
  });
});

describe("createLayerFromReceipt", () => {
  it("creates a layer", () => {
    const layer = createLayerFromReceipt("l1", "org_1", "prd_1", "wh_1", 100, 12.5, "po_1");
    expect(layer.quantity).toBe(100);
    expect(layer.unitCost).toBe(12.5);
    expect(layer.purchaseOrderId).toBe("po_1");
  });
});
