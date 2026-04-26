import type {
  AppSnapshot,
  Product,
  PurchaseOrder,
  SalesOrder,
  StockRow,
  Supplier,
} from "./types";

type RecommendationSnapshot = Pick<
  AppSnapshot,
  | "products"
  | "suppliers"
  | "stockRows"
  | "openSalesOrders"
  | "openPurchaseOrders"
>;

export type PurchaseRecommendation = ReturnType<
  typeof buildPurchaseRecommendations
>[number];

export function buildPurchaseRecommendations(snapshot: RecommendationSnapshot) {
  return snapshot.products
    .filter((product) => product.isActive)
    .map((product) => {
      const onHand = productStockOnHand(snapshot.stockRows, product.id);
      const openSalesDemand = salesDemand(snapshot.openSalesOrders, product.id);
      const pendingInbound = pendingPurchaseUnits(
        snapshot.openPurchaseOrders,
        product.id,
      );
      const projectedAvailable = onHand + pendingInbound - openSalesDemand;
      const targetStock = Math.max(
        product.minimumStock * 2,
        product.minimumStock + openSalesDemand,
      );
      const suggestedQuantity = Math.max(0, targetStock - projectedAvailable);
      const supplier = preferredSupplier(snapshot.suppliers, product);

      const urgency: "critical" | "warning" | "normal" =
        projectedAvailable < 0
          ? "critical"
          : projectedAvailable <= product.minimumStock
            ? "warning"
            : "normal";

      return {
        product,
        supplier,
        onHand,
        openSalesDemand,
        pendingInbound,
        projectedAvailable,
        targetStock,
        suggestedQuantity,
        urgency,
      };
    })
    .filter(
      (recommendation) =>
        recommendation.suggestedQuantity > 0 &&
        recommendation.projectedAvailable <= recommendation.product.minimumStock,
    )
    .sort((left, right) => {
      const urgencyRank = { critical: 0, warning: 1, normal: 2 };
      const urgencyDelta =
        urgencyRank[left.urgency] - urgencyRank[right.urgency];

      if (urgencyDelta !== 0) {
        return urgencyDelta;
      }

      if (left.suggestedQuantity !== right.suggestedQuantity) {
        return right.suggestedQuantity - left.suggestedQuantity;
      }

      return left.product.sku.localeCompare(right.product.sku);
    });
}

function productStockOnHand(rows: StockRow[], productId: string) {
  return rows
    .filter((row) => row.product.id === productId)
    .reduce((total, row) => total + row.onHand, 0);
}

function salesDemand(orders: SalesOrder[], productId: string) {
  return orders.reduce(
    (total, order) =>
      total +
      order.lines
        .filter((line) => line.productId === productId)
        .reduce((subtotal, line) => subtotal + line.quantity, 0),
    0,
  );
}

function pendingPurchaseUnits(orders: PurchaseOrder[], productId: string) {
  return orders.reduce(
    (total, order) =>
      total +
      order.lines
        .filter((line) => line.productId === productId)
        .reduce(
          (subtotal, line) =>
            subtotal + Math.max(0, line.quantity - line.receivedQuantity),
          0,
        ),
    0,
  );
}

function preferredSupplier(suppliers: Supplier[], product: Product) {
  return (
    suppliers.find((supplier) => supplier.productIds.includes(product.id)) ??
    suppliers[0]
  );
}
