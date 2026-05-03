import type { Product, SalesOrder, SalesOrderStatus } from "@stockops/core/types";
import type { TrendyolOrder, TrendyolProduct } from "./types";

const STATUS_MAP: Record<string, SalesOrderStatus> = {
  Created: "DRAFT",
  Picking: "PICKING",
  Invoiced: "CONFIRMED",
  Shipped: "SHIPPED",
  Delivered: "DELIVERED",
  Cancelled: "CANCELLED",
  UnDelivered: "SHIPPED",
  Returned: "CANCELLED",
  Repack: "PACKED",
  UnSupplied: "CANCELLED",
};

/**
 * Map a Trendyol order to a StockOps sales order.
 * Matches line items by barcode → Product.barcode or Product.sku.
 */
export function trendyolOrderToSalesOrder(
  order: TrendyolOrder,
  productsMap: Map<string, Product>,
  organizationId: string,
  orderCode: string,
): Omit<SalesOrder, "id"> {
  const customerName =
    `${order.customerFirstName} ${order.customerLastName}`.trim() ||
    order.customerEmail ||
    `Trendyol #${order.orderNumber}`;

  const lines = order.lines
    .filter((line) => {
      const key = line.barcode || line.merchantSku;
      return key && productsMap.has(key);
    })
    .map((line) => {
      const key = line.barcode || line.merchantSku;
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
    createdAt: new Date(order.orderDate).toISOString(),
  };
}

/**
 * Map a Trendyol product to a StockOps product.
 * Uses barcode as the primary SKU identifier.
 */
export function trendyolProductToProduct(
  product: TrendyolProduct,
  organizationId: string,
): Omit<Product, "id"> {
  return {
    organizationId,
    sku: product.stockCode || product.barcode,
    name: product.title,
    barcode: product.barcode,
    category: String(product.categoryId),
    unitPrice: product.salePrice,
    minimumStock: 0,
    isActive: true,
  };
}

/**
 * Build a barcode/SKU-keyed products map for matching Trendyol items.
 * Indexes by both barcode and sku for maximum match coverage.
 */
export function buildBarcodeProductsMap(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const product of products) {
    if (product.barcode) {
      map.set(product.barcode, product);
    }
    if (product.sku) {
      map.set(product.sku, product);
    }
  }
  return map;
}

/**
 * Validate a Trendyol order payload has required fields.
 */
export function validateOrderPayload(payload: unknown): payload is TrendyolOrder {
  if (!payload || typeof payload !== "object") return false;

  const order = payload as Record<string, unknown>;
  if (!order.orderNumber || !Array.isArray(order.lines)) return false;
  if (order.lines.length === 0) return false;

  for (const line of order.lines) {
    if (typeof line !== "object" || !line) return false;
    const l = line as Record<string, unknown>;
    if (!l.quantity || Number(l.quantity) <= 0) return false;
  }

  return true;
}
