import { createHash, randomBytes } from "node:crypto";
import { createInitialState } from "@stockops/core/demo-data";
import {
  assertEnoughStock,
  buildStockRows,
  can,
  getOpenPurchaseOrders,
  getOpenSalesOrders,
} from "@stockops/core/inventory";
import {
  productInputSchema,
  productUpdateInputSchema,
  purchaseOrderInputSchema,
  salesOrderInputSchema,
  stockMovementInputSchema,
  supplierInputSchema,
  supplierUpdateInputSchema,
} from "@stockops/core/schemas";
import { verifyPassword } from "@stockops/core/password";
import type {
  AppState,
  AppSnapshot,
  AuthContext,
  AuditLog,
  Product,
  PurchaseOrder,
  SalesOrder,
  Session,
  StockMovement,
  Supplier,
} from "@stockops/core/types";

const globalForStore = globalThis as typeof globalThis & {
  stockOpsState?: AppState;
};

function state() {
  globalForStore.stockOpsState ??= createInitialState();
  return globalForStore.stockOpsState;
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function code(prefix: string, count: number) {
  return `${prefix}-${String(count + 1001).padStart(4, "0")}`;
}

function audit(entry: Omit<AuditLog, "id" | "createdAt">) {
  state().auditLogs.unshift({
    ...entry,
    id: id("aud"),
    createdAt: new Date().toISOString(),
  });
}

export function getAppSnapshot() {
  const appState = state();
  const user = appState.users[0];
  const organization = appState.organizations[0];
  const membership = appState.memberships.find(
    (item) =>
      item.userId === user.id && item.organizationId === organization.id,
  );

  if (!membership) {
    throw new Error("Demo user is not a member of the demo organization.");
  }

  return getDemoSnapshot({
    user,
    organization,
    role: membership.role,
    sessionToken: "demo",
  });
}

export function getDemoSnapshot(context: AuthContext): AppSnapshot {
  const appState = state();
  const { organization, user, role } = context;
  const warehouses = appState.warehouses.filter(
    (warehouse) => warehouse.organizationId === organization.id,
  );
  const products = appState.products.filter(
    (product) => product.organizationId === organization.id,
  );
  const suppliers = appState.suppliers.filter(
    (supplier) => supplier.organizationId === organization.id,
  );
  const stockMovements = appState.stockMovements.filter(
    (movement) => movement.organizationId === organization.id,
  );
  const salesOrders = appState.salesOrders.filter(
    (order) => order.organizationId === organization.id,
  );
  const purchaseOrders = appState.purchaseOrders.filter(
    (order) => order.organizationId === organization.id,
  );
  const stockRows = buildStockRows(products, warehouses, stockMovements);
  const criticalRows = stockRows.filter((row) => row.isCritical);

  return {
    organization,
    user,
    role,
    warehouses,
    products,
    suppliers,
    stockMovements,
    salesOrders,
    purchaseOrders,
    stockRows,
    criticalRows,
    openSalesOrders: getOpenSalesOrders(salesOrders),
    openPurchaseOrders: getOpenPurchaseOrders(purchaseOrders),
    auditLogs: appState.auditLogs.slice(0, 8),
    permissions: {
      canManageUsers: can(role, "manage_users"),
      canManageProducts: can(role, "manage_products"),
      canManageStock: can(role, "manage_stock"),
      canManageSales: can(role, "manage_sales"),
      canManagePurchasing: can(role, "manage_purchasing"),
    },
  };
}

export function authenticateDemoUser(email: string, password: string) {
  const appState = state();
  const user = appState.users.find(
    (item) => item.email.toLowerCase() === email.toLowerCase(),
  );

  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  const membership = appState.memberships.find((item) => item.userId === user.id);
  const organization = appState.organizations.find(
    (item) => item.id === membership?.organizationId,
  );

  if (!membership || !organization) {
    return null;
  }

  return { user, organization, role: membership.role };
}

export function createDemoSession(userId: string, organizationId: string) {
  const token = randomBytes(32).toString("base64url");
  const session: Session = {
    id: id("ses"),
    userId,
    organizationId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    createdAt: new Date().toISOString(),
  };

  state().sessions.unshift(session);

  return { token, session };
}

export function getDemoAuthContext(token: string) {
  const appState = state();
  const tokenHash = hashToken(token);
  const session = appState.sessions.find((item) => item.tokenHash === tokenHash);

  if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
    return null;
  }

  const user = appState.users.find((item) => item.id === session.userId);
  const organization = appState.organizations.find(
    (item) => item.id === session.organizationId,
  );
  const membership = appState.memberships.find(
    (item) =>
      item.userId === session.userId &&
      item.organizationId === session.organizationId,
  );

  if (!user || !organization || !membership) {
    return null;
  }

  return {
    user,
    organization,
    role: membership.role,
    sessionToken: token,
  };
}

export function deleteDemoSession(token: string) {
  const tokenHash = hashToken(token);
  const appState = state();
  appState.sessions = appState.sessions.filter(
    (session) => session.tokenHash !== tokenHash,
  );
}

function getMembershipForContext(appState: AppState, context: AuthContext) {
  const membership = appState.memberships.find(
    (item) =>
      item.userId === context.user.id &&
      item.organizationId === context.organization.id,
  );

  if (!membership) {
    throw new Error("Kullanıcı bu işletmeye bağlı değil.");
  }

  return membership;
}

export function createProduct(input: unknown, context?: AuthContext) {
  const parsed = productInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_products")) {
    throw new Error("Bu rol ürün yönetemez.");
  }

  const exists = appState.products.some(
    (product) =>
      product.organizationId === organization.id && product.sku === parsed.sku,
  );

  if (exists) {
    throw new Error("Bu SKU zaten kayıtlı.");
  }

  const product: Product = {
    ...parsed,
    id: id("prd"),
    organizationId: organization.id,
    barcode: parsed.barcode || undefined,
    isActive: true,
  };

  appState.products.unshift(product);
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "Product",
    entityId: product.id,
    summary: `${product.sku} ürünü oluşturuldu`,
  });

  return product;
}

export function updateProduct(
  productId: string,
  input: unknown,
  context?: AuthContext,
) {
  const parsed = productUpdateInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!productId) {
    throw new Error("Urun bulunamadi.");
  }

  if (!can(membership.role, "manage_products")) {
    throw new Error("Bu rol urun yonetemez.");
  }

  const product = appState.products.find(
    (item) =>
      item.id === productId && item.organizationId === organization.id,
  );

  if (!product) {
    throw new Error("Urun bulunamadi.");
  }

  if (
    parsed.sku &&
    appState.products.some(
      (item) =>
        item.organizationId === organization.id &&
        item.id !== product.id &&
        item.sku === parsed.sku,
    )
  ) {
    throw new Error("Bu SKU zaten kayitli.");
  }

  Object.assign(product, {
    ...parsed,
    barcode: parsed.barcode === "" ? undefined : parsed.barcode,
  });
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "UPDATE",
    entityType: "Product",
    entityId: product.id,
    summary: `${product.sku} urunu guncellendi`,
  });

  return product;
}

export function setProductActive(
  productId: string,
  isActive: boolean,
  context?: AuthContext,
) {
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!productId) {
    throw new Error("Urun bulunamadi.");
  }

  if (!can(membership.role, "manage_products")) {
    throw new Error("Bu rol urun yonetemez.");
  }

  const product = appState.products.find(
    (item) =>
      item.id === productId && item.organizationId === organization.id,
  );

  if (!product) {
    throw new Error("Urun bulunamadi.");
  }

  product.isActive = isActive;
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "UPDATE",
    entityType: "Product",
    entityId: product.id,
    summary: `${product.sku} urunu ${isActive ? "aktif" : "pasif"} yapildi`,
  });

  return product;
}

export function createStockMovement(
  input: unknown,
  context?: AuthContext,
) {
  const parsed = stockMovementInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_stock")) {
    throw new Error("Bu rol stok hareketi oluşturamaz.");
  }

  const quantityChange =
    parsed.type === "OUTBOUND" ? -parsed.quantity : parsed.quantity;

  if (quantityChange < 0) {
    assertEnoughStock(appState.stockMovements, parsed.warehouseId, [
      { productId: parsed.productId, quantity: parsed.quantity },
    ]);
  }

  const movement: StockMovement = {
    id: id("mov"),
    organizationId: organization.id,
    warehouseId: parsed.warehouseId,
    productId: parsed.productId,
    type: parsed.type,
    quantityChange,
    note: parsed.note || undefined,
    createdById: user.id,
    createdAt: new Date().toISOString(),
  };

  appState.stockMovements.unshift(movement);
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "StockMovement",
    entityId: movement.id,
    summary: `${parsed.type} hareketi kaydedildi`,
  });

  return movement;
}

export function createSupplier(input: unknown, context?: AuthContext) {
  const parsed = supplierInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_purchasing")) {
    throw new Error("Bu rol tedarikçi oluşturamaz.");
  }

  const exists = appState.suppliers.some(
    (supplier) =>
      supplier.organizationId === organization.id &&
      supplier.name === parsed.name,
  );

  if (exists) {
    throw new Error("Bu tedarikci zaten kayitli.");
  }

  const supplier: Supplier = {
    ...parsed,
    id: id("sup"),
    organizationId: organization.id,
    email: parsed.email || undefined,
    productIds: [],
  };

  appState.suppliers.unshift(supplier);
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "Supplier",
    entityId: supplier.id,
    summary: `${supplier.name} tedarikçisi oluşturuldu`,
  });

  return supplier;
}

export function updateSupplier(
  supplierId: string,
  input: unknown,
  context?: AuthContext,
) {
  const parsed = supplierUpdateInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!supplierId) {
    throw new Error("Tedarikci bulunamadi.");
  }

  if (!can(membership.role, "manage_purchasing")) {
    throw new Error("Bu rol tedarikci yonetemez.");
  }

  const supplier = appState.suppliers.find(
    (item) =>
      item.id === supplierId && item.organizationId === organization.id,
  );

  if (!supplier) {
    throw new Error("Tedarikci bulunamadi.");
  }

  if (
    parsed.name &&
    appState.suppliers.some(
      (item) =>
        item.organizationId === organization.id &&
        item.id !== supplier.id &&
        item.name === parsed.name,
    )
  ) {
    throw new Error("Bu tedarikci zaten kayitli.");
  }

  Object.assign(supplier, {
    ...parsed,
    email: parsed.email === "" ? undefined : parsed.email,
  });
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "UPDATE",
    entityType: "Supplier",
    entityId: supplier.id,
    summary: `${supplier.name} tedarikcisi guncellendi`,
  });

  return supplier;
}

export function createSalesOrder(input: unknown, context?: AuthContext) {
  const parsed = salesOrderInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_sales")) {
    throw new Error("Bu rol satış siparişi oluşturamaz.");
  }

  const order: SalesOrder = {
    id: id("so"),
    organizationId: organization.id,
    code: code("SO", appState.salesOrders.length),
    customerName: parsed.customerName,
    status: "DRAFT",
    lines: [{ productId: parsed.productId, quantity: parsed.quantity }],
    createdAt: new Date().toISOString(),
  };

  appState.salesOrders.unshift(order);
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "SalesOrder",
    entityId: order.id,
    summary: `${order.code} satış siparişi oluşturuldu`,
  });

  return order;
}

export function confirmSalesOrder(orderId: string, context?: AuthContext) {
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);
  const warehouse = appState.warehouses.find(
    (item) => item.organizationId === organization.id && item.isDefault,
  );
  const order = appState.salesOrders.find(
    (item) => item.organizationId === organization.id && item.id === orderId,
  );

  if (!warehouse || !order) {
    throw new Error("Sipariş veya depo bulunamadı.");
  }

  if (!can(membership.role, "manage_sales")) {
    throw new Error("Bu rol satış siparişi onaylayamaz.");
  }

  if (order.status !== "DRAFT") {
    throw new Error("Sadece taslak satış siparişleri onaylanabilir.");
  }

  assertEnoughStock(appState.stockMovements, warehouse.id, order.lines);

  order.status = "CONFIRMED";

  order.lines.forEach((line) => {
    appState.stockMovements.unshift({
      id: id("mov"),
      organizationId: organization.id,
      warehouseId: warehouse.id,
      productId: line.productId,
      type: "SALE",
      quantityChange: -line.quantity,
      reference: order.code,
      note: "Satış siparişi onayı",
      createdById: user.id,
      createdAt: new Date().toISOString(),
    });
  });

  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CONFIRM",
    entityType: "SalesOrder",
    entityId: order.id,
    summary: `${order.code} onaylandı ve stok düşüldü`,
  });
}

export function createPurchaseOrder(
  input: unknown,
  context?: AuthContext,
) {
  const parsed = purchaseOrderInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_purchasing")) {
    throw new Error("Bu rol satın alma siparişi oluşturamaz.");
  }

  const order: PurchaseOrder = {
    id: id("po"),
    organizationId: organization.id,
    code: code("PO", appState.purchaseOrders.length),
    supplierId: parsed.supplierId,
    status: "SENT",
    expectedDate: parsed.expectedDate || undefined,
    lines: [
      {
        productId: parsed.productId,
        quantity: parsed.quantity,
        receivedQuantity: 0,
      },
    ],
    createdAt: new Date().toISOString(),
  };

  appState.purchaseOrders.unshift(order);
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "PurchaseOrder",
    entityId: order.id,
    summary: `${order.code} satın alma siparişi oluşturuldu`,
  });

  return order;
}

export function receivePurchaseOrder(orderId: string, context?: AuthContext) {
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);
  const warehouse = appState.warehouses.find(
    (item) => item.organizationId === organization.id && item.isDefault,
  );
  const order = appState.purchaseOrders.find(
    (item) => item.organizationId === organization.id && item.id === orderId,
  );

  if (!warehouse || !order) {
    throw new Error("Sipariş veya depo bulunamadı.");
  }

  if (!can(membership.role, "manage_purchasing")) {
    throw new Error("Bu rol satın alma teslim alamaz.");
  }

  order.lines.forEach((line) => {
    const remaining = line.quantity - line.receivedQuantity;

    if (remaining <= 0) {
      return;
    }

    line.receivedQuantity += remaining;
    appState.stockMovements.unshift({
      id: id("mov"),
      organizationId: organization.id,
      warehouseId: warehouse.id,
      productId: line.productId,
      type: "PURCHASE_RECEIPT",
      quantityChange: remaining,
      reference: order.code,
      note: "Satın alma teslimi",
      createdById: user.id,
      createdAt: new Date().toISOString(),
    });
  });

  order.status = order.lines.every(
    (line) => line.receivedQuantity >= line.quantity,
  )
    ? "COMPLETED"
    : "PARTIALLY_RECEIVED";

  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "RECEIVE",
    entityType: "PurchaseOrder",
    entityId: order.id,
    summary: `${order.code} teslim alındı`,
  });
}

function getDemoSnapshotContext(appState: AppState): AuthContext {
  const user = appState.users[0];
  const organization = appState.organizations[0];
  const membership = appState.memberships.find(
    (item) =>
      item.userId === user.id && item.organizationId === organization.id,
  );

  if (!membership) {
    throw new Error("Demo user is not a member of the demo organization.");
  }

  return {
    user,
    organization,
    role: membership.role,
    sessionToken: "demo",
  };
}
