import type { Product, SalesOrder, SalesOrderStatus } from "@stockops/core/types";
import type { PazaramaOrder, PazaramaProduct } from "./types";

const STATUS_MAP: Record<string, SalesOrderStatus> = {
  New: "DRAFT",
  Approved: "CONFIRMED",
  Picking: "PICKING",
  Shipped: "SHIPPED",
  Delivered: "DELIVERED",
  Cancelled: "CANCELLED",
  Returned: "CANCELLED",
};

/**
 * Map a Pazarama order to a StockOps sales order.
 * Matches line items by merchantSku or barcode → Product.sku/barcode.
 */
export function pazaramaOrderToSalesOrder(
  order: PazaramaOrder,
  productsMap: Map<string, Product>,
  organizationId: string,
  orderCode: string,
): Omit<SalesOrder, "id"> {
  const customerName =
    order.customerName?.trim() ||
    order.customerEmail ||
    `Pazarama #${order.orderNumber}`;

  const lines = order.lines
    .filter((line) => {
      const key = line.merchantSku || line.barcode;
      return key && productsMap.has(key);
    })
    .map((line) => {
      const key = line.merchantSku || line.barcode;
      return {
        productId: productsMap.get(key)!.id,
        quantity: line.quantity,
      };
    });

  const status = STATUS_MAP[order.status] ?? "DRAFT";

  return {
    organizationId,
    code: orderCode,
    customerName,
    status,
    lines,
    createdAt: order.orderDate,
  };
}

/**
 * Map a Pazarama product to a StockOps product.
 */
export function pazaramaProductToProduct(
  product: PazaramaProduct,
  organizationId: string,
): Omit<Product, "id"> {
  return {
    organizationId,
    sku: product.merchantSku,
    name: product.productName,
    barcode: product.barcode || undefined,
    category: "Pazarama",
    unitPrice: product.salePrice,
    minimumStock: 0,
    isActive: true,
  };
}

/**
 * Build an SKU/barcode-keyed products map for Pazarama matching.
 */
export function buildPazaramaProductsMap(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const product of products) {
    if (product.sku) map.set(product.sku, product);
    if (product.barcode) map.set(product.barcode, product);
  }
  return map;
}

/**
 * Validate a Pazarama order payload.
 */
export function validateOrderPayload(payload: unknown): payload is PazaramaOrder {
  if (!payload || typeof payload !== "object") return false;

  const order = payload as Record<string, unknown>;
  if (!order.orderNumber && !order.orderId) return false;
  if (!Array.isArray(order.lines)) return false;
  if (order.lines.length === 0) return false;

  for (const line of order.lines) {
    if (typeof line !== "object" || !line) return false;
    const l = line as Record<string, unknown>;
    if (!l.quantity || Number(l.quantity) <= 0) return false;
  }

  return true;
}
