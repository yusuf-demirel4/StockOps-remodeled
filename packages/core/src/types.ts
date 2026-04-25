export type Role =
  | "Owner"
  | "Admin"
  | "WarehouseStaff"
  | "SalesStaff"
  | "PurchasingStaff"
  | "Viewer";

export type StockMovementType =
  | "INBOUND"
  | "OUTBOUND"
  | "ADJUSTMENT"
  | "SALE"
  | "PURCHASE_RECEIPT"
  | "TRANSFER";

export type SalesOrderStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";
export type PurchaseOrderStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "COMPLETED"
  | "CANCELLED";

export type Permission =
  | "manage_users"
  | "manage_products"
  | "manage_stock"
  | "manage_sales"
  | "manage_purchasing"
  | "view_dashboard";

export type Organization = {
  id: string;
  name: string;
  slug: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
};

export type Membership = {
  organizationId: string;
  userId: string;
  role: Role;
};

export type Warehouse = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  isDefault: boolean;
};

export type Product = {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  barcode?: string;
  category: string;
  description?: string;
  minimumStock: number;
  isActive: boolean;
};

export type Supplier = {
  id: string;
  organizationId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  leadTimeDays: number;
  productIds: string[];
};

export type StockMovement = {
  id: string;
  organizationId: string;
  warehouseId: string;
  productId: string;
  type: StockMovementType;
  quantityChange: number;
  reference?: string;
  note?: string;
  createdById?: string;
  createdAt: string;
};

export type OrderLine = {
  productId: string;
  quantity: number;
};

export type SalesOrder = {
  id: string;
  organizationId: string;
  code: string;
  customerName: string;
  status: SalesOrderStatus;
  lines: OrderLine[];
  createdAt: string;
};

export type PurchaseOrderLine = OrderLine & {
  receivedQuantity: number;
};

export type PurchaseOrder = {
  id: string;
  organizationId: string;
  supplierId: string;
  code: string;
  status: PurchaseOrderStatus;
  expectedDate?: string;
  lines: PurchaseOrderLine[];
  createdAt: string;
};

export type AuditLog = {
  id: string;
  organizationId: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
};

export type Session = {
  id: string;
  userId: string;
  organizationId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
};

export type AppState = {
  organizations: Organization[];
  users: User[];
  memberships: Membership[];
  warehouses: Warehouse[];
  products: Product[];
  suppliers: Supplier[];
  stockMovements: StockMovement[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  auditLogs: AuditLog[];
  sessions: Session[];
};

export type AuthContext = {
  user: User;
  organization: Organization;
  role: Role;
  sessionToken: string;
};

export type AppSnapshot = {
  organization: Organization;
  user: User;
  role: Role;
  warehouses: Warehouse[];
  products: Product[];
  suppliers: Supplier[];
  stockMovements: StockMovement[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  stockRows: StockRow[];
  criticalRows: StockRow[];
  openSalesOrders: SalesOrder[];
  openPurchaseOrders: PurchaseOrder[];
  auditLogs: AuditLog[];
  permissions: {
    canManageUsers: boolean;
    canManageProducts: boolean;
    canManageStock: boolean;
    canManageSales: boolean;
    canManagePurchasing: boolean;
  };
};

export type StockRow = {
  product: Product;
  warehouse: Warehouse;
  onHand: number;
  minimumStock: number;
  isCritical: boolean;
};
