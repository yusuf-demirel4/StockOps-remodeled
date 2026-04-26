import { describe, expect, it } from "vitest";
import {
  createProduct,
  createStockTransfer,
  createSupplier,
  createWarehouse,
  getAppSnapshot,
  setProductActive,
  updateProduct,
  updateSupplier,
  updateWarehouse,
} from "@/lib/demo-store";
import type { AuthContext } from "@stockops/core/types";

function demoContext(): AuthContext {
  const snapshot = getAppSnapshot();

  return {
    organization: snapshot.organization,
    role: snapshot.role,
    sessionToken: "test",
    user: snapshot.user,
  };
}

describe("P0 demo mutations", () => {
  it("updates product fields and toggles product activity", () => {
    const context = demoContext();
    const suffix = `P0-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const product = createProduct(
      {
        barcode: "TEST-BARCODE",
        category: "Test",
        minimumStock: "3",
        name: "P0 Test Product",
        sku: suffix,
      },
      context,
    );

    const updated = updateProduct(
      product.id,
      {
        barcode: "",
        category: "Updated",
        minimumStock: "7",
        name: "Updated P0 Test Product",
        sku: `${suffix}-V2`,
      },
      context,
    );

    expect(updated).toMatchObject({
      barcode: undefined,
      category: "Updated",
      minimumStock: 7,
      name: "Updated P0 Test Product",
      sku: `${suffix}-V2`,
    });
    expect(setProductActive(product.id, false, context).isActive).toBe(false);
    expect(setProductActive(product.id, true, context).isActive).toBe(true);
    expect(() =>
      updateProduct(product.id, { sku: "KBD-MX-001" }, context),
    ).toThrow(/SKU/);
  });

  it("updates supplier fields and protects supplier name uniqueness", () => {
    const context = demoContext();
    const suffix = `P0 Supplier ${Date.now()} ${Math.random()
      .toString(16)
      .slice(2)}`;
    const supplier = createSupplier(
      {
        contactName: "Initial Contact",
        email: "initial@example.test",
        leadTimeDays: "4",
        name: suffix,
        phone: "+90 500 000 00 00",
      },
      context,
    );

    const updated = updateSupplier(
      supplier.id,
      {
        contactName: "Updated Contact",
        email: "",
        leadTimeDays: "8",
        name: `${suffix} Updated`,
        phone: "+90 500 000 00 01",
      },
      context,
    );

    expect(updated).toMatchObject({
      contactName: "Updated Contact",
      email: undefined,
      leadTimeDays: 8,
      name: `${suffix} Updated`,
      phone: "+90 500 000 00 01",
    });
    expect(() =>
      updateSupplier(supplier.id, { name: "TechLine Tedarik" }, context),
    ).toThrow(/tedarikci/);
  });

  it("transfers stock between warehouses through paired movements", () => {
    const context = demoContext();
    const transfer = createStockTransfer(
      {
        destinationWarehouseId: "wh_showroom",
        productId: "prd_kbd_mx",
        quantity: "5",
        sourceWarehouseId: "wh_main",
      },
      context,
    );

    expect(transfer.reference).toMatch(/^TR-/);
    expect(transfer.movements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: "prd_kbd_mx",
          quantityChange: -5,
          warehouseId: "wh_main",
        }),
        expect.objectContaining({
          productId: "prd_kbd_mx",
          quantityChange: 5,
          warehouseId: "wh_showroom",
        }),
      ]),
    );
    expect(() =>
      createStockTransfer(
        {
          destinationWarehouseId: "wh_main",
          productId: "prd_monitor_27",
          quantity: "1",
          sourceWarehouseId: "wh_showroom",
        },
        context,
      ),
    ).toThrow(/Insufficient stock/);
  });

  it("creates warehouses and keeps one default warehouse", () => {
    const context = demoContext();
    const suffix = Math.random().toString(16).slice(2, 8).toUpperCase();
    const warehouse = createWarehouse(
      {
        code: `W${suffix}`,
        name: "West Hub",
      },
      context,
    );

    expect(warehouse).toMatchObject({
      code: `W${suffix}`,
      isDefault: false,
      name: "West Hub",
    });

    const updated = updateWarehouse(
      warehouse.id,
      {
        code: `W${suffix}A`,
        isDefault: true,
        name: "West Hub A",
      },
      context,
    );
    const snapshot = getAppSnapshot();

    expect(updated).toMatchObject({
      code: `W${suffix}A`,
      isDefault: true,
      name: "West Hub A",
    });
    expect(
      snapshot.warehouses.filter((item) => item.isDefault).map((item) => item.id),
    ).toEqual([warehouse.id]);
    expect(() =>
      createWarehouse({ code: "MAIN", name: "Duplicate Main" }, context),
    ).toThrow(/depo kodu/);
  });
});
