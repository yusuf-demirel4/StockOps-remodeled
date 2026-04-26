import type {
  AppSnapshot,
  Product,
  PurchaseOrder,
  SalesOrder,
  StockRow,
} from "./types";

type DashboardSnapshot = Pick<
  AppSnapshot,
  | "products"
  | "warehouses"
  | "stockRows"
  | "stockMovements"
  | "openSalesOrders"
  | "openPurchaseOrders"
>;

export type DashboardSummary = ReturnType<typeof buildDashboardSummary>;

export function buildDashboardSummary(snapshot: DashboardSnapshot) {
  const activeProducts = snapshot.products.filter((product) => product.isActive);
  const totalOnHand = snapshot.stockRows.reduce(
    (total, row) => total + row.onHand,
    0,
  );
  const criticalRows = sortCriticalRows(
    snapshot.stockRows.filter((row) => row.isCritical),
  );
  const stockRowCount = snapshot.stockRows.length;
  const healthyStockRowCount = stockRowCount - criticalRows.length;
  const stockHealthPercent =
    stockRowCount === 0
      ? 100
      : Math.round((healthyStockRowCount / stockRowCount) * 100);
  const salesOrderReadiness = snapshot.openSalesOrders.map((order) =>
    buildSalesOrderReadiness(order, snapshot.stockRows),
  );

  return {
    activeProductCount: activeProducts.length,
    inactiveProductCount: snapshot.products.length - activeProducts.length,
    totalOnHand,
    criticalStockRowCount: criticalRows.length,
    criticalProductCount: new Set(criticalRows.map((row) => row.product.id))
      .size,
    stockHealthPercent,
    openSalesOrderCount: snapshot.openSalesOrders.length,
    openPurchaseOrderCount: snapshot.openPurchaseOrders.length,
    openSalesUnits: sumOrderUnits(snapshot.openSalesOrders),
    pendingPurchaseUnits: sumPendingPurchaseUnits(snapshot.openPurchaseOrders),
    readySalesOrderCount: salesOrderReadiness.filter((item) => item.isReady)
      .length,
    blockedSalesOrderCount: salesOrderReadiness.filter((item) => !item.isReady)
      .length,
    criticalRows,
    warehouseSummaries: snapshot.warehouses.map((warehouse) => {
      const rows = snapshot.stockRows.filter(
        (row) => row.warehouse.id === warehouse.id,
      );
      const warehouseOnHand = rows.reduce((total, row) => total + row.onHand, 0);

      return {
        warehouse,
        onHand: warehouseOnHand,
        stockSharePercent:
          totalOnHand === 0 ? 0 : Math.round((warehouseOnHand / totalOnHand) * 100),
        criticalCount: rows.filter((row) => row.isCritical).length,
        stockedProductCount: rows.filter((row) => row.onHand > 0).length,
      };
    }),
    salesOrderReadiness,
    topMovingProducts: buildTopMovingProducts(
      activeProducts,
      snapshot.stockMovements,
    ),
  };
}

function sortCriticalRows(rows: StockRow[]) {
  return [...rows].sort((left, right) => {
    const leftShortage = stockShortage(left);
    const rightShortage = stockShortage(right);

    if (leftShortage !== rightShortage) {
      return rightShortage - leftShortage;
    }

    return left.onHand - right.onHand;
  });
}

function buildSalesOrderReadiness(order: SalesOrder, stockRows: StockRow[]) {
  const requiredByProduct = new Map<string, number>();

  for (const line of order.lines) {
    requiredByProduct.set(
      line.productId,
      (requiredByProduct.get(line.productId) ?? 0) + line.quantity,
    );
  }

  const blockedLines = Array.from(requiredByProduct.entries())
    .map(([productId, requiredQuantity]) => {
      const defaultWarehouseRows = stockRows.filter(
        (row) => row.product.id === productId && row.warehouse.isDefault,
      );
      const candidateRows =
        defaultWarehouseRows.length > 0
          ? defaultWarehouseRows
          : stockRows.filter((row) => row.product.id === productId);
      const availableQuantity = candidateRows.reduce(
        (total, row) => total + row.onHand,
        0,
      );

      return {
        productId,
        requiredQuantity,
        availableQuantity,
      };
    })
    .filter((line) => line.availableQuantity < line.requiredQuantity);

  return {
    order,
    units: order.lines.reduce((total, line) => total + line.quantity, 0),
    isReady: blockedLines.length === 0,
    blockedLines,
  };
}

function buildTopMovingProducts(
  products: Product[],
  movements: DashboardSnapshot["stockMovements"],
) {
  return products
    .map((product) => {
      const productMovements = movements.filter(
        (movement) => movement.productId === product.id,
      );

      return {
        product,
        movementCount: productMovements.length,
        movedUnits: productMovements.reduce(
          (total, movement) => total + Math.abs(movement.quantityChange),
          0,
        ),
        netChange: productMovements.reduce(
          (total, movement) => total + movement.quantityChange,
          0,
        ),
      };
    })
    .filter((item) => item.movementCount > 0)
    .sort((left, right) => {
      if (left.movedUnits !== right.movedUnits) {
        return right.movedUnits - left.movedUnits;
      }

      return left.product.sku.localeCompare(right.product.sku);
    })
    .slice(0, 5);
}

export function stockShortage(row: StockRow) {
  return Math.max(0, row.minimumStock - row.onHand);
}

function sumOrderUnits(orders: SalesOrder[]) {
  return orders.reduce(
    (total, order) =>
      total + order.lines.reduce((subtotal, line) => subtotal + line.quantity, 0),
    0,
  );
}

function sumPendingPurchaseUnits(orders: PurchaseOrder[]) {
  return orders.reduce(
    (total, order) =>
      total +
      order.lines.reduce(
        (subtotal, line) =>
          subtotal + Math.max(0, line.quantity - line.receivedQuantity),
        0,
      ),
    0,
  );
}
