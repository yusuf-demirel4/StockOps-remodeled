import type { Product, SalesOrder, StockMovement } from "@stockops/core/types";
import type {
  ShopifyLineItem,
  ShopifyOrder,
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
  const customerName = shopifyOrder.customer
    ? `${shopifyOrder.customer.firstName} ${shopifyOrder.customer.lastName}`.trim()
    : shopifyOrder.email || `Shopify ${shopifyOrder.name}`;

  const lines = shopifyOrder.lineItems
    .filter((item) => item.sku && productsMap.has(item.sku))
    .map((item) => ({
      productId: productsMap.get(item.sku)!.id,
      quantity: item.quantity,
    }));

  return {
    organizationId,
    code: orderCode,
    customerName,
    status: shopifyOrder.cancelledAt ? "CANCELLED" : "DRAFT",
    lines,
    createdAt: shopifyOrder.createdAt,
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
  const movements: Omit<StockMovement, "id">[] = [];

  for (const refund of shopifyOrder.refunds) {
    for (const refundLine of refund.refundLineItems) {
      if (refundLine.restockType !== "return") continue;

      const lineItem = shopifyOrder.lineItems.find(
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

  if (!order.id || !order.name) return false;

  if (!Array.isArray(order.line_items) || order.line_items.length === 0) {
    return false;
  }

  for (const item of order.line_items) {
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
