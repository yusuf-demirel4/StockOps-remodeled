import { describe, expect, it } from "vitest";
import {
  buildProductsMap,
  detectInventoryDiscrepancies,
  shopifyOrderToSalesOrder,
  shopifyRefundToStockMovements,
  shopifyVariantToProduct,
  validateOrderPayload,
  validateProductPayload,
} from "../mapper";
import type { Product } from "@stockops/core/types";
import type { ShopifyOrder, ShopifyProduct } from "../types";

const ORG_ID = "org_test";

const sampleShopifyProduct: ShopifyProduct = {
  id: "333",
  title: "Mekanik Klavye MX",
  handle: "mekanik-klavye-mx",
  vendor: "TechLine",
  productType: "Klavye",
  status: "ACTIVE",
  updatedAt: "2025-03-15T10:00:00Z",
  variants: [
    {
      id: "222",
      title: "Default Title",
      sku: "KBD-MX-001",
      barcode: "8690000001234",
      price: "499.00",
      compareAtPrice: "599.00",
      inventoryItemId: "444",
      inventoryQuantity: 50,
      weight: 0.85,
      weightUnit: "kg",
    },
  ],
};

const sampleProducts: Product[] = [
  {
    id: "prd_1",
    organizationId: ORG_ID,
    sku: "KBD-MX-001",
    name: "Mekanik Klavye MX",
    category: "Klavye",
    minimumStock: 10,
    isActive: true,
    unitPrice: 499,
  },
  {
    id: "prd_2",
    organizationId: ORG_ID,
    sku: "MOU-WL-002",
    name: "Kablosuz Mouse",
    category: "Mouse",
    minimumStock: 20,
    isActive: true,
    unitPrice: 299,
  },
];

describe("shopifyVariantToProduct", () => {
  it("should map a Shopify variant to StockOps product", () => {
    const result = shopifyVariantToProduct(
      sampleShopifyProduct,
      sampleShopifyProduct.variants[0],
      ORG_ID,
    );

    expect(result.sku).toBe("KBD-MX-001");
    expect(result.name).toBe("Mekanik Klavye MX");
    expect(result.barcode).toBe("8690000001234");
    expect(result.unitPrice).toBe(499);
    expect(result.isActive).toBe(true);
    expect(result.organizationId).toBe(ORG_ID);
  });

  it("should include variant title when not Default Title", () => {
    const product: ShopifyProduct = {
      ...sampleShopifyProduct,
      variants: [
        { ...sampleShopifyProduct.variants[0], title: "Kırmızı / XL" },
      ],
    };

    const result = shopifyVariantToProduct(product, product.variants[0], ORG_ID);
    expect(result.name).toBe("Mekanik Klavye MX - Kırmızı / XL");
  });
});

describe("shopifyOrderToSalesOrder", () => {
  it("should map order with matching SKUs", () => {
    const shopifyOrder: ShopifyOrder = {
      id: "5678",
      name: "#1001",
      email: "customer@example.com",
      createdAt: "2025-03-15T10:00:00Z",
      updatedAt: "2025-03-15T10:00:00Z",
      cancelledAt: null,
      financialStatus: "paid",
      fulfillmentStatus: null,
      totalPrice: "1297.00",
      currency: "TRY",
      customer: {
        id: "9876",
        firstName: "Ahmet",
        lastName: "Yilmaz",
        email: "customer@example.com",
      },
      lineItems: [
        {
          id: "111",
          title: "Mekanik Klavye MX",
          sku: "KBD-MX-001",
          quantity: 2,
          price: "499.00",
          variantId: "222",
          productId: "333",
        },
        {
          id: "112",
          title: "Kablosuz Mouse",
          sku: "MOU-WL-002",
          quantity: 1,
          price: "299.00",
          variantId: "223",
          productId: "334",
        },
      ],
      refunds: [],
    };

    const productsMap = buildProductsMap(sampleProducts);
    const result = shopifyOrderToSalesOrder(
      shopifyOrder,
      productsMap,
      ORG_ID,
      "SO-1001",
    );

    expect(result.customerName).toBe("Ahmet Yilmaz");
    expect(result.code).toBe("SO-1001");
    expect(result.status).toBe("DRAFT");
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].productId).toBe("prd_1");
    expect(result.lines[0].quantity).toBe(2);
    expect(result.lines[1].productId).toBe("prd_2");
  });

  it("should skip line items with no matching SKU", () => {
    const shopifyOrder: ShopifyOrder = {
      id: "5679",
      name: "#1002",
      email: "",
      createdAt: "2025-03-15T10:00:00Z",
      updatedAt: "2025-03-15T10:00:00Z",
      cancelledAt: null,
      financialStatus: "paid",
      fulfillmentStatus: null,
      totalPrice: "100.00",
      currency: "TRY",
      customer: null,
      lineItems: [
        {
          id: "113",
          title: "Unknown Product",
          sku: "UNKNOWN-SKU",
          quantity: 1,
          price: "100.00",
          variantId: null,
          productId: null,
        },
      ],
      refunds: [],
    };

    const productsMap = buildProductsMap(sampleProducts);
    const result = shopifyOrderToSalesOrder(
      shopifyOrder,
      productsMap,
      ORG_ID,
      "SO-1002",
    );

    expect(result.lines).toHaveLength(0);
  });
});

describe("shopifyRefundToStockMovements", () => {
  it("should create inbound movements for returned items", () => {
    const shopifyOrder: ShopifyOrder = {
      id: "5678",
      name: "#1001",
      email: "",
      createdAt: "2025-03-15T10:00:00Z",
      updatedAt: "2025-03-16T10:00:00Z",
      cancelledAt: null,
      financialStatus: "refunded",
      fulfillmentStatus: "fulfilled",
      totalPrice: "998.00",
      currency: "TRY",
      customer: null,
      lineItems: [
        {
          id: "111",
          title: "Mekanik Klavye MX",
          sku: "KBD-MX-001",
          quantity: 2,
          price: "499.00",
          variantId: "222",
          productId: "333",
        },
      ],
      refunds: [
        {
          id: "ref_1",
          createdAt: "2025-03-16T10:00:00Z",
          refundLineItems: [
            { lineItemId: "111", quantity: 1, restockType: "return" },
          ],
        },
      ],
    };

    const productsMap = buildProductsMap(sampleProducts);
    const movements = shopifyRefundToStockMovements(
      shopifyOrder,
      productsMap,
      "wh_1",
      ORG_ID,
      "usr_1",
    );

    expect(movements).toHaveLength(1);
    expect(movements[0].productId).toBe("prd_1");
    expect(movements[0].quantityChange).toBe(1);
    expect(movements[0].type).toBe("INBOUND");
    expect(movements[0].reference).toContain("SHOPIFY-REFUND");
  });

  it("should skip non-return restock types", () => {
    const shopifyOrder: ShopifyOrder = {
      id: "5678",
      name: "#1001",
      email: "",
      createdAt: "2025-03-15T10:00:00Z",
      updatedAt: "2025-03-16T10:00:00Z",
      cancelledAt: null,
      financialStatus: "refunded",
      fulfillmentStatus: null,
      totalPrice: "499.00",
      currency: "TRY",
      customer: null,
      lineItems: [
        {
          id: "111",
          title: "Mekanik Klavye MX",
          sku: "KBD-MX-001",
          quantity: 1,
          price: "499.00",
          variantId: "222",
          productId: "333",
        },
      ],
      refunds: [
        {
          id: "ref_2",
          createdAt: "2025-03-16T10:00:00Z",
          refundLineItems: [
            { lineItemId: "111", quantity: 1, restockType: "no_restock" },
          ],
        },
      ],
    };

    const productsMap = buildProductsMap(sampleProducts);
    const movements = shopifyRefundToStockMovements(
      shopifyOrder,
      productsMap,
      "wh_1",
      ORG_ID,
      "usr_1",
    );

    expect(movements).toHaveLength(0);
  });
});

describe("detectInventoryDiscrepancies", () => {
  it("should detect quantity mismatches", () => {
    const getQty = (sku: string) => (sku === "KBD-MX-001" ? 45 : 0);

    const discrepancies = detectInventoryDiscrepancies(
      [sampleShopifyProduct],
      sampleProducts,
      getQty,
    );

    expect(discrepancies).toHaveLength(1);
    expect(discrepancies[0].sku).toBe("KBD-MX-001");
    expect(discrepancies[0].shopifyQuantity).toBe(50);
    expect(discrepancies[0].stockopsQuantity).toBe(45);
    expect(discrepancies[0].difference).toBe(5);
  });

  it("should return empty when quantities match", () => {
    const getQty = (sku: string) => (sku === "KBD-MX-001" ? 50 : 0);

    const discrepancies = detectInventoryDiscrepancies(
      [sampleShopifyProduct],
      sampleProducts,
      getQty,
    );

    expect(discrepancies).toHaveLength(0);
  });
});

describe("validateOrderPayload", () => {
  it("should accept valid order payload", () => {
    const payload = {
      id: 123,
      name: "#1001",
      line_items: [{ id: 1, sku: "ABC", quantity: 2, price: "10.00" }],
    };
    expect(validateOrderPayload(payload)).toBe(true);
  });

  it("should reject empty payload", () => {
    expect(validateOrderPayload(null)).toBe(false);
    expect(validateOrderPayload({})).toBe(false);
  });

  it("should reject payload with empty line_items", () => {
    expect(validateOrderPayload({ id: 1, name: "#1", line_items: [] })).toBe(false);
  });

  it("should reject payload with zero quantity", () => {
    const payload = {
      id: 1,
      name: "#1",
      line_items: [{ id: 1, sku: "X", quantity: 0 }],
    };
    expect(validateOrderPayload(payload)).toBe(false);
  });
});

describe("validateProductPayload", () => {
  it("should accept valid product payload", () => {
    expect(validateProductPayload({ id: 1, title: "Test" })).toBe(true);
  });

  it("should reject missing fields", () => {
    expect(validateProductPayload({ id: 1 })).toBe(false);
    expect(validateProductPayload({ title: "Test" })).toBe(false);
    expect(validateProductPayload(null)).toBe(false);
  });
});
