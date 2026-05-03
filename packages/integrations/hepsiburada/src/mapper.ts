import type { Product, SalesOrder, SalesOrderStatus } from "@stockops/core/types";
import type { HepsiburadaOrder, HepsiburadaProduct } from "./types";

const STATUS_MAP: Record<string, SalesOrderStatus> = {
  New: "DRAFT",
  Approved: "CONFIRMED",
  Picking: "PICKING",
  Shipped: "SHIPPED",
  Delivered: "DELIVERED",
  Cancelled: "CANCELLED",
  UnDelivered: "SHIPPED",
  Open: "DRAFT",
  Unpacked: "CONFIRMED",
  Packed: "PACKED",
};

/**
 * Map a Hepsiburada order to a StockOps sales order.
 * Matches line items by merchantSku → Product.sku.
 */
export function hbOrderToSalesOrder(
  order: HepsiburadaOrder,
  productsMap: Map<string, Product>,
  organizationId: string,
  orderCode: string,
): Omit<SalesOrder, "id"> {
  const customerName =
    order.customerName?.trim() ||
    order.customerEmail ||
    `Hepsiburada #${order.orderNumber}`;

  const lines = order.lines
    .filter((line) => {
      const key = line.merchantSku || line.hepsiburadaSku;
      return key && productsMap.has(key);
    })
    .map((line) => {
      const key = line.merchantSku || line.hepsiburadaSku;
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
 * Map a Hepsiburada product to a StockOps product.
 */
export function hbProductToProduct(
  product: HepsiburadaProduct,
  organizationId: string,
): Omit<Product, "id"> {
  return {
    organizationId,
    sku: product.merchantSku,
    name: product.productName,
    barcode: product.barcode || undefined,
    category: "Hepsiburada",
    unitPrice: product.price,
    minimumStock: 0,
    isActive: true,
  };
}

/**
 * Build an SKU-keyed products map for Hepsiburada matching.
 * Indexes by sku, barcode, and merchantSku for maximum match coverage.
 */
export function buildHBProductsMap(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const product of products) {
    if (product.sku) map.set(product.sku, product);
    if (product.barcode) map.set(product.barcode, product);
  }
  return map;
}

/**
 * Validate a Hepsiburada order payload has required fields.
 */
export function validateOrderPayload(payload: unknown): payload is HepsiburadaOrder {
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
