import type { Product, SalesOrder, StockMovement } from "@stockops/core/types";
import type {
  ShopifyLineItem,
  ShopifyOrder,
  ShopifyRefund,
  ShopifyProduct,
  ShopifyVariant,
} from "./types";

/**
 * Map a Shopify product + variant to a StockOps product.
 * Each Shopify variant becomes a separate StockOps product (matched by SKU).
 */
export function shopifyVariantToProduct(
  shopifyProduct: ShopifyProduct,
  variant: ShopifyVariant,
  organizationId: string,
): Omit<Product, "id"> {
  const name =
    variant.title === "Default Title"
      ? shopifyProduct.title
      : `${shopifyProduct.title} - ${variant.title}`;

  return {
    organizationId,
    sku: variant.sku,
    name,
    barcode: variant.barcode ?? undefined,
    category: shopifyProduct.productType || "Shopify",
    unitPrice: Number.parseFloat(variant.price) || 0,
    minimumStock: 0,
    isActive: shopifyProduct.status === "ACTIVE",
  };
}

/**
 * Map a Shopify order to a StockOps sales order.
 * Only maps line items that have a matching SKU in the provided products map.
 */
export function shopifyOrderToSalesOrder(
  shopifyOrder: ShopifyOrder,
  productsMap: Map<string, Product>,
  organizationId: string,
  orderCode: string,
): Omit<SalesOrder, "id"> {
  const normalizedOrder = normalizeShopifyOrder(shopifyOrder);
  const customerName = normalizedOrder.customer
    ? `${normalizedOrder.customer.firstName} ${normalizedOrder.customer.lastName}`.trim()
    : normalizedOrder.email || `Shopify ${normalizedOrder.name}`;

  const lines = normalizedOrder.lineItems
    .filter((item) => item.sku && productsMap.has(item.sku))
    .map((item) => ({
      productId: productsMap.get(item.sku)!.id,
      quantity: item.quantity,
    }));

  return {
    organizationId,
    code: orderCode,
    customerName,
    status: normalizedOrder.cancelledAt ? "CANCELLED" : "DRAFT",
    lines,
    createdAt: normalizedOrder.createdAt,
  };
}

/**
 * Map a Shopify refund to stock reversal movements.
 * Only creates movements for items with restock_type === "return".
 */
export function shopifyRefundToStockMovements(
  shopifyOrder: ShopifyOrder,
  productsMap: Map<string, Product>,
  warehouseId: string,
  organizationId: string,
  userId: string,
): Omit<StockMovement, "id">[] {
  const normalizedOrder = normalizeShopifyOrder(shopifyOrder);
  const movements: Omit<StockMovement, "id">[] = [];

  for (const refund of normalizedOrder.refunds) {
    for (const refundLine of refund.refundLineItems) {
      if (refundLine.restockType !== "return") continue;

      const lineItem = normalizedOrder.lineItems.find(
        (li) => li.id === refundLine.lineItemId,
      );
      if (!lineItem?.sku) continue;

      const product = productsMap.get(lineItem.sku);
      if (!product) continue;

      movements.push({
        organizationId,
        warehouseId,
        productId: product.id,
        type: "INBOUND",
        quantityChange: refundLine.quantity,
        reference: `SHOPIFY-REFUND-${refund.id}`,
        note: `Shopify iade: Sipariş ${shopifyOrder.name}`,
        createdById: userId,
        createdAt: refund.createdAt,
      });
    }
  }

  return movements;
}

/**
 * Build a SKU-keyed products map for efficient lookup during order/refund mapping.
 */
export function buildProductsMap(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const product of products) {
    if (product.sku) {
      map.set(product.sku, product);
    }
  }
  return map;
}

/**
 * Compare Shopify variant inventory with StockOps stock to detect discrepancies.
 */
export function detectInventoryDiscrepancies(
  shopifyProducts: ShopifyProduct[],
  stockOpsProducts: Product[],
  getStockOpsQuantity: (sku: string) => number,
) {
  const discrepancies: {
    sku: string;
    productName: string;
    shopifyQuantity: number;
    stockopsQuantity: number;
    difference: number;
  }[] = [];

  const stockOpsMap = buildProductsMap(stockOpsProducts);

  for (const shopifyProduct of shopifyProducts) {
    for (const variant of shopifyProduct.variants) {
      if (!variant.sku) continue;

      const stockOpsProduct = stockOpsMap.get(variant.sku);
      if (!stockOpsProduct) continue;

      const stockOpsQty = getStockOpsQuantity(variant.sku);
      const shopifyQty = variant.inventoryQuantity;

      if (shopifyQty !== stockOpsQty) {
        discrepancies.push({
          sku: variant.sku,
          productName: stockOpsProduct.name,
          shopifyQuantity: shopifyQty,
          stockopsQuantity: stockOpsQty,
          difference: shopifyQty - stockOpsQty,
        });
      }
    }
  }

  return discrepancies;
}

/**
 * Validate a Shopify webhook payload has the minimum required fields.
 * Rejects malformed/blank payloads - never create garbage data.
 */
export function validateOrderPayload(payload: unknown): payload is ShopifyOrder {
  if (!payload || typeof payload !== "object") return false;

  const order = payload as Record<string, unknown>;
  const lineItems = Array.isArray(order.line_items)
    ? order.line_items
    : Array.isArray(order.lineItems)
      ? order.lineItems
      : null;

  if (!order.id || !order.name) return false;

  if (!lineItems || lineItems.length === 0) {
    return false;
  }

  for (const item of lineItems) {
    if (typeof item !== "object" || !item) return false;
    if (!item.quantity || item.quantity <= 0) return false;
  }

  return true;
}

/**
 * Validate a Shopify product payload.
 */
export function validateProductPayload(payload: unknown): payload is ShopifyProduct {
  if (!payload || typeof payload !== "object") return false;

  const product = payload as Record<string, unknown>;
  return Boolean(product.id && product.title);
}

type ShopifyOrderLike = Record<string, unknown> & {
  cancelledAt?: string | null;
  cancelled_at?: string | null;
  createdAt?: string;
  created_at?: string;
  customer?: unknown;
  email?: string;
  currency?: string;
  financialStatus?: string;
  financial_status?: string;
  fulfillmentStatus?: string | null;
  fulfillment_status?: string | null;
  lineItems?: unknown[];
  line_items?: unknown[];
  refunds?: unknown[];
  totalPrice?: string;
  total_price?: string;
  updatedAt?: string;
  updated_at?: string;
};

function normalizeShopifyOrder(order: ShopifyOrder | ShopifyOrderLike): ShopifyOrder {
  const rawOrder = order as ShopifyOrderLike;
  const normalizedLineItems = normalizeShopifyLineItems(rawOrder.lineItems ?? rawOrder.line_items);
  const normalizedRefunds = normalizeShopifyRefunds(rawOrder.refunds);

  return {
    id: String(rawOrder.id ?? ""),
    name: String(rawOrder.name ?? ""),
    email: String(rawOrder.email ?? ""),
    createdAt: String(rawOrder.createdAt ?? rawOrder.created_at ?? ""),
    updatedAt: String(
      rawOrder.updatedAt ?? rawOrder.updated_at ?? rawOrder.createdAt ?? rawOrder.created_at ?? "",
    ),
    cancelledAt: (rawOrder.cancelledAt ?? rawOrder.cancelled_at ?? null) as string | null,
    financialStatus: String(rawOrder.financialStatus ?? rawOrder.financial_status ?? ""),
    fulfillmentStatus: (rawOrder.fulfillmentStatus ?? rawOrder.fulfillment_status ?? null) as string | null,
    totalPrice: String(rawOrder.totalPrice ?? rawOrder.total_price ?? "0"),
    currency: String(rawOrder.currency ?? ""),
    customer: normalizeShopifyCustomer(rawOrder.customer),
    lineItems: normalizedLineItems,
    refunds: normalizedRefunds,
  };
}

function normalizeShopifyCustomer(customer: unknown): ShopifyOrder["customer"] {
  if (!customer || typeof customer !== "object") {
    return null;
  }

  const value = customer as Record<string, unknown>;

  return {
    id: String(value.id ?? ""),
    firstName: String(value.firstName ?? value.first_name ?? ""),
    lastName: String(value.lastName ?? value.last_name ?? ""),
    email: String(value.email ?? ""),
  };
}

function normalizeShopifyLineItems(lineItems: unknown): ShopifyLineItem[] {
  if (!Array.isArray(lineItems)) {
    return [];
  }

  return lineItems.map((item) => normalizeShopifyLineItem(item));
}

function normalizeShopifyLineItem(item: unknown): ShopifyLineItem {
  const value = item as Record<string, unknown>;

  return {
    id: String(value.id ?? ""),
    title: String(value.title ?? ""),
    sku: String(value.sku ?? ""),
    quantity: Number(value.quantity ?? 0),
    price: String(value.price ?? "0"),
    variantId:
      value.variantId !== undefined && value.variantId !== null
        ? String(value.variantId)
        : value.variant_id !== undefined && value.variant_id !== null
          ? String(value.variant_id)
          : null,
    productId:
      value.productId !== undefined && value.productId !== null
        ? String(value.productId)
        : value.product_id !== undefined && value.product_id !== null
          ? String(value.product_id)
          : null,
  };
}

function normalizeShopifyRefunds(refunds: unknown): ShopifyRefund[] {
  if (!Array.isArray(refunds)) {
    return [];
  }

  return refunds.map((refund) => normalizeShopifyRefund(refund));
}

function normalizeShopifyRefund(refund: unknown): ShopifyRefund {
  const value = refund as Record<string, unknown>;
  const rawRefundLineItems =
    value.refundLineItems ?? value.refund_line_items ?? [];

  return {
    id: String(value.id ?? ""),
    createdAt: String(value.createdAt ?? value.created_at ?? ""),
    refundLineItems: Array.isArray(rawRefundLineItems)
      ? rawRefundLineItems.map((lineItem) => normalizeShopifyRefundLineItem(lineItem))
      : [],
  };
}

function normalizeShopifyRefundLineItem(refundLineItem: unknown): ShopifyRefund["refundLineItems"][number] {
  const value = refundLineItem as Record<string, unknown>;

  return {
    lineItemId: String(value.lineItemId ?? value.line_item_id ?? ""),
    quantity: Number(value.quantity ?? 0),
    restockType:
      (value.restockType as ShopifyRefund["refundLineItems"][number]["restockType"] | undefined) ??
      (value.restock_type as ShopifyRefund["refundLineItems"][number]["restockType"] | undefined) ??
      "no_restock",
  };
}
