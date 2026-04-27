import { describe, expect, it } from "vitest";
import { handleShopifyWebhook } from "../webhook-handler";
import type { WebhookContext } from "../webhook-handler";
import type { Product } from "@stockops/core/types";
import ordersCreateFixture from "./fixtures/orders-create.json";
import productsUpdateFixture from "./fixtures/products-update.json";
import inventoryLevelsUpdateFixture from "./fixtures/inventory-levels-update.json";

const products: Product[] = [
  {
    id: "prd_1",
    organizationId: "org_test",
    sku: "KBD-MX-001",
    name: "Mekanik Klavye MX",
    category: "Klavye",
    minimumStock: 10,
    isActive: true,
    unitPrice: 499,
  },
  {
    id: "prd_2",
    organizationId: "org_test",
    sku: "MOU-WL-002",
    name: "Kablosuz Mouse",
    category: "Mouse",
    minimumStock: 20,
    isActive: true,
    unitPrice: 299,
  },
];

let orderCodeCounter = 1000;

const context: WebhookContext = {
  organizationId: "org_test",
  userId: "usr_test",
  defaultWarehouseId: "wh_test",
  products,
  nextOrderCode: () => `SO-${++orderCodeCounter}`,
};

describe("handleShopifyWebhook with real payloads", () => {
  it("should process orders/create with real fixture", () => {
    const result = handleShopifyWebhook(
      "orders/create",
      ordersCreateFixture,
      context,
    );

    expect(result.status).toBe("processed");
    expect(result.topic).toBe("orders/create");
    expect(result.message).toContain("#1001");
    expect(result.data).toBeDefined();

    const data = result.data as any;
    expect(data.salesOrder.lines).toHaveLength(2);
    expect(data.salesOrder.customerName).toBe("Ahmet Yilmaz");
  });

  it("should process products/update with real fixture", () => {
    const result = handleShopifyWebhook(
      "products/update",
      productsUpdateFixture,
      context,
    );

    expect(result.status).toBe("processed");
    expect(result.topic).toBe("products/update");
  });

  it("should process inventory_levels/update with real fixture", () => {
    const result = handleShopifyWebhook(
      "inventory_levels/update",
      inventoryLevelsUpdateFixture,
      context,
    );

    expect(result.status).toBe("processed");
    expect(result.topic).toBe("inventory_levels/update");
    expect(result.data).toEqual({
      inventoryItemId: "444",
      locationId: "555",
      available: 48,
    });
  });

  it("should reject blank/malformed order", () => {
    const result = handleShopifyWebhook("orders/create", {}, context);
    expect(result.status).toBe("failed");
  });

  it("should reject order with empty line_items", () => {
    const result = handleShopifyWebhook(
      "orders/create",
      { id: 1, name: "#1", line_items: [] },
      context,
    );
    expect(result.status).toBe("failed");
  });

  it("should ignore unknown topics", () => {
    const result = handleShopifyWebhook(
      "app/uninstalled",
      { id: 1 },
      context,
    );
    expect(result.status).toBe("ignored");
  });

  it("should ignore orders with no matching SKUs", () => {
    const payload = {
      ...ordersCreateFixture,
      line_items: [
        { id: 999, title: "Unknown", sku: "NONEXISTENT", quantity: 1, price: "10.00" },
      ],
    };

    const result = handleShopifyWebhook("orders/create", payload, context);
    expect(result.status).toBe("ignored");
  });

  it("should handle orders/cancelled", () => {
    const payload = {
      ...ordersCreateFixture,
      cancelled_at: "2025-03-16T10:00:00Z",
    };

    const result = handleShopifyWebhook("orders/cancelled", payload, context);
    expect(result.status).toBe("processed");
    expect(result.data).toHaveProperty("cancelledAt");
  });

  it("should handle refunds/create", () => {
    const payload = { id: "ref_1", order_id: "5678" };
    const result = handleShopifyWebhook("refunds/create", payload, context);
    expect(result.status).toBe("processed");
  });

  it("should fail refunds/create with missing data", () => {
    const result = handleShopifyWebhook("refunds/create", {}, context);
    expect(result.status).toBe("failed");
  });
});
