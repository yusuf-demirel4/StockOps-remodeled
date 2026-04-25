import { describe, expect, it } from "vitest";
import { createInitialState } from "./demo-data";
import {
  assertEnoughStock,
  buildStockRows,
  can,
  getOpenPurchaseOrders,
  getOpenSalesOrders,
  getStockOnHand,
} from "./inventory";

describe("inventory domain", () => {
  it("calculates stock from movement ledger", () => {
    const state = createInitialState();

    expect(getStockOnHand(state.stockMovements, "prd_kbd_mx", "wh_main")).toBe(
      30,
    );
    expect(
      getStockOnHand(state.stockMovements, "prd_mouse_wireless", "wh_main"),
    ).toBe(16);
  });

  it("flags minimum stock alerts per product and warehouse", () => {
    const state = createInitialState();
    const rows = buildStockRows(
      state.products,
      state.warehouses,
      state.stockMovements,
    );
    const monitorMain = rows.find(
      (row) =>
        row.product.id === "prd_monitor_27" && row.warehouse.id === "wh_main",
    );

    expect(monitorMain?.onHand).toBe(6);
    expect(monitorMain?.minimumStock).toBe(8);
    expect(monitorMain?.isCritical).toBe(true);
  });

  it("blocks movements and sales that would create negative stock", () => {
    const state = createInitialState();

    expect(() =>
      assertEnoughStock(state.stockMovements, "wh_main", [
        { productId: "prd_monitor_27", quantity: 7 },
      ]),
    ).toThrow("Insufficient stock");
  });

  it("returns open sales and purchase orders", () => {
    const state = createInitialState();

    expect(getOpenSalesOrders(state.salesOrders)).toHaveLength(1);
    expect(getOpenPurchaseOrders(state.purchaseOrders)).toHaveLength(1);
  });

  it("keeps detailed role permissions explicit", () => {
    expect(can("WarehouseStaff", "manage_stock")).toBe(true);
    expect(can("WarehouseStaff", "manage_sales")).toBe(false);
    expect(can("Owner", "manage_users")).toBe(true);
  });
});
