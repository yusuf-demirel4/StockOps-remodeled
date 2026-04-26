import { describe, expect, it } from "vitest";
import {
  createProduct,
  createSupplier,
  getAppSnapshot,
  setProductActive,
  updateProduct,
  updateSupplier,
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
});
