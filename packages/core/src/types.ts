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

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PAID"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "CANCELLED";

export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "CREDIT_CARD"
  | "CHECK"
  | "OTHER";

export type SalesOrderStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";
export type PurchaseOrderStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "COMPLETED"
  | "CANCELLED";
export type WebhookSource = "SHOPIFY" | "WOOCOMMERCE";
export type WebhookEventStatus =
  | "PENDING"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED"
  | "IGNORED";
export type NotificationChannel = "SMS" | "WHATSAPP";
export type NotificationDeliveryStatus =
  | "PENDING"
  | "SENT"
  | "FAILED"
  | "SKIPPED";

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

export type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
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
  unitPrice: number;
  costPrice?: number;
  averageCost?: number;
  weight?: number;
  dimensionL?: number;
  dimensionW?: number;
  dimensionH?: number;
  minimumStock: number;
  isActive: boolean;
};

export type ProductVariant = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  barcode?: string;
  unitPrice: number;
  costPrice?: number;
  weight?: number;
  isActive: boolean;
  attributes: Record<string, string>;
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

export type Customer = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: string;
  paymentTermDays: number;
  isActive: boolean;
};

export type Invoice = {
  id: string;
  organizationId: string;
  customerId: string;
  code: string;
  status: InvoiceStatus;
  issuedAt?: string;
  dueDate?: string;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  lines: InvoiceLine[];
  createdAt: string;
};

export type InvoiceLine = {
  id?: string;
  productId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

export type Payment = {
  id: string;
  organizationId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paidAt: string;
  createdAt: string;
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
  customerId?: string;
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

export type SalesReturnStatus = "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED";

export type SalesReturn = {
  id: string;
  organizationId: string;
  salesOrderId: string;
  code: string;
  reason?: string;
  status: SalesReturnStatus;
  lines: SalesReturnLine[];
  createdAt: string;
};

export type SalesReturnLine = {
  productId: string;
  quantity: number;
  restocked: boolean;
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

export type ApiToken = {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  tokenHash: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt: string;
};

export type WebhookEvent = {
  id: string;
  organizationId: string;
  source: WebhookSource;
  topic: string;
  externalId?: string;
  dedupeKey: string;
  status: WebhookEventStatus;
  payload: unknown;
  headers?: Record<string, string>;
  error?: string;
  attempts: number;
  receivedAt: string;
  processedAt?: string;
};

export type NotificationDelivery = {
  id: string;
  organizationId: string;
  channel: NotificationChannel;
  provider: string;
  recipient?: string;
  message: string;
  status: NotificationDeliveryStatus;
  reason?: string;
  error?: string;
  createdAt: string;
  sentAt?: string;
};

export type AppState = {
  organizations: Organization[];
  users: User[];
  memberships: Membership[];
  warehouses: Warehouse[];
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  stockMovements: StockMovement[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  sessions: Session[];
  apiTokens?: ApiToken[];
  webhookEvents?: WebhookEvent[];
  notificationDeliveries?: NotificationDelivery[];
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
  members: Member[];
  stockMovements: StockMovement[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  salesReturns: SalesReturn[];
  productVariants: ProductVariant[];
  stockRows: StockRow[];
  criticalRows: StockRow[];
  openSalesOrders: SalesOrder[];
  openPurchaseOrders: PurchaseOrder[];
  auditLogs: AuditLog[];
  webhookEvents: WebhookEvent[];
  notificationDeliveries: NotificationDelivery[];
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
