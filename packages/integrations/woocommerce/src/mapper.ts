import type { Product, SalesOrder, StockMovement } from "@stockops/core/types";
import type { WooLineItem, WooOrder, WooProduct, WooRefund } from "./types";

export function wooProductToProduct(
  wooProduct: WooProduct,
  organizationId: string,
): Omit<Product, "id"> {
  return {
    organizationId,
    sku: wooProduct.sku,
    name: wooProduct.name,
    category:
      wooProduct.categories.length > 0
        ? wooProduct.categories[0].name
        : "WooCommerce",
    unitPrice: Number.parseFloat(wooProduct.regular_price) || 0,
    minimumStock: 0,
    isActive: wooProduct.status === "publish",
  };
}

export function wooOrderToSalesOrder(
  wooOrder: WooOrder,
  productsMap: Map<string, Product>,
  organizationId: string,
  orderCode: string,
): Omit<SalesOrder, "id"> {
  const customerName =
    `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`.trim() ||
    wooOrder.billing.email ||
    `WooCommerce #${wooOrder.number}`;

  const lines = wooOrder.line_items
    .filter((item) => item.sku && productsMap.has(item.sku))
    .map((item) => ({
      productId: productsMap.get(item.sku)!.id,
      quantity: item.quantity,
    }));

  const isCancelled = ["cancelled", "refunded", "failed"].includes(
    wooOrder.status,
  );

  return {
    organizationId,
    code: orderCode,
    customerName,
    status: isCancelled ? "CANCELLED" : "DRAFT",
    lines,
    createdAt: wooOrder.date_created,
  };
}

export function wooRefundToStockMovements(
  wooOrder: WooOrder,
  productsMap: Map<string, Product>,
  warehouseId: string,
  organizationId: string,
  userId: string,
): Omit<StockMovement, "id">[] {
  const movements: Omit<StockMovement, "id">[] = [];

  for (const refund of wooOrder.refunds) {
    for (const refundLine of refund.line_items) {
      if (!refundLine.sku) continue;

      const product = productsMap.get(refundLine.sku);
      if (!product) continue;

      const quantity = Math.abs(refundLine.quantity);
      if (quantity <= 0) continue;

      movements.push({
        organizationId,
        warehouseId,
        productId: product.id,
        type: "INBOUND",
        quantityChange: quantity,
        reference: `WOO-REFUND-${refund.id}`,
        note: `WooCommerce iade: Sipariş #${wooOrder.number}`,
        createdById: userId,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return movements;
}

export function buildProductsMap(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const product of products) {
    if (product.sku) {
      map.set(product.sku, product);
    }
  }
  return map;
}

export function validateWooOrderPayload(payload: unknown): payload is WooOrder {
  if (!payload || typeof payload !== "object") return false;

  const order = payload as Record<string, unknown>;
  if (!order.id || !order.number) return false;

  if (!Array.isArray(order.line_items) || order.line_items.length === 0) {
    return false;
  }

  for (const item of order.line_items) {
    if (typeof item !== "object" || !item) return false;
    if (!item.quantity || item.quantity <= 0) return false;
  }

  return true;
}

export function validateWooProductPayload(payload: unknown): payload is WooProduct {
  if (!payload || typeof payload !== "object") return false;
  const product = payload as Record<string, unknown>;
  return Boolean(product.id && product.name);
}

export function detectWooInventoryDiscrepancies(
  wooProducts: WooProduct[],
  stockOpsProducts: Product[],
  getStockOpsQuantity: (sku: string) => number,
) {
  const discrepancies: {
    sku: string;
    productName: string;
    wooQuantity: number;
    stockopsQuantity: number;
    difference: number;
  }[] = [];

  const stockOpsMap = buildProductsMap(stockOpsProducts);

  for (const wooProduct of wooProducts) {
    if (!wooProduct.sku || !wooProduct.manage_stock) continue;

    const stockOpsProduct = stockOpsMap.get(wooProduct.sku);
    if (!stockOpsProduct) continue;

    const stockOpsQty = getStockOpsQuantity(wooProduct.sku);
    const wooQty = wooProduct.stock_quantity ?? 0;

    if (wooQty !== stockOpsQty) {
      discrepancies.push({
        sku: wooProduct.sku,
        productName: stockOpsProduct.name,
        wooQuantity: wooQty,
        stockopsQuantity: stockOpsQty,
        difference: wooQty - stockOpsQty,
      });
    }
  }

  return discrepancies;
}
