import type {
  AppState,
  OrderLine,
  Permission,
  Product,
  PurchaseOrder,
  Role,
  SalesOrder,
  StockMovement,
  StockRow,
  Warehouse,
} from "@/lib/types";

export const rolePermissions: Record<Role, Permission[]> = {
  Owner: [
    "manage_users",
    "manage_products",
    "manage_stock",
    "manage_sales",
    "manage_purchasing",
    "view_dashboard",
  ],
  Admin: [
    "manage_users",
    "manage_products",
    "manage_stock",
    "manage_sales",
    "manage_purchasing",
    "view_dashboard",
  ],
  WarehouseStaff: ["manage_stock", "view_dashboard"],
  SalesStaff: ["manage_sales", "view_dashboard"],
  PurchasingStaff: ["manage_purchasing", "view_dashboard"],
  Viewer: ["view_dashboard"],
};

export function can(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export function getStockOnHand(
  movements: StockMovement[],
  productId: string,
  warehouseId: string,
) {
  return movements
    .filter(
      (movement) =>
        movement.productId === productId && movement.warehouseId === warehouseId,
    )
    .reduce((total, movement) => total + movement.quantityChange, 0);
}

export function buildStockRows(
  products: Product[],
  warehouses: Warehouse[],
  movements: StockMovement[],
): StockRow[] {
  return products
    .filter((product) => product.isActive)
    .flatMap((product) =>
      warehouses.map((warehouse) => {
        const onHand = getStockOnHand(movements, product.id, warehouse.id);

        return {
          product,
          warehouse,
          onHand,
          minimumStock: product.minimumStock,
          isCritical: onHand <= product.minimumStock,
        };
      }),
    );
}

export function assertEnoughStock(
  movements: StockMovement[],
  warehouseId: string,
  lines: OrderLine[],
) {
  const errors = lines.flatMap((line) => {
    const onHand = getStockOnHand(movements, line.productId, warehouseId);

    return onHand < line.quantity
      ? [`${line.productId}: requested ${line.quantity}, available ${onHand}`]
      : [];
  });

  if (errors.length > 0) {
    throw new Error(`Insufficient stock: ${errors.join("; ")}`);
  }
}

export function getOpenSalesOrders(orders: SalesOrder[]) {
  return orders.filter((order) => order.status === "DRAFT");
}

export function getOpenPurchaseOrders(orders: PurchaseOrder[]) {
  return orders.filter((order) =>
    ["DRAFT", "SENT", "PARTIALLY_RECEIVED"].includes(order.status),
  );
}

export function getCurrentMembership(state: AppState) {
  const user = state.users[0];
  const organization = state.organizations[0];
  const membership = state.memberships.find(
    (item) =>
      item.userId === user.id && item.organizationId === organization.id,
  );

  if (!membership) {
    throw new Error("Current user is not a member of the current organization.");
  }

  return { user, organization, membership };
}
