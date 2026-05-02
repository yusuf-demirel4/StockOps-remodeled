import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createInitialState } from "@stockops/core/demo-data";
import {
  assertEnoughStock,
  buildStockRows,
  can,
  getOpenPurchaseOrders,
  getOpenSalesOrders,
  getStockOnHand,
} from "@stockops/core/inventory";
import {
  productInputSchema,
  productUpdateInputSchema,
  customerInputSchema,
  invoiceInputSchema,
  creditNoteInputSchema,
  paymentInputSchema,
  purchaseOrderInputSchema,
  salesOrderInputSchema,
  stockMovementInputSchema,
  stockTransferInputSchema,
  supplierInputSchema,
  supplierUpdateInputSchema,
  userInputSchema,
  userUpdateRoleSchema,
  warehouseInputSchema,
  warehouseUpdateInputSchema,
} from "@stockops/core/schemas";
import { hashPassword, verifyPassword } from "@stockops/core/password";
import {
  bomInputSchema,
  bomUpdateInputSchema,
  manufacturingOrderInputSchema,
  customFieldInputSchema,
  organizationSettingsInputSchema,
  stocktakeCountInputSchema,
  webhookSubscriptionInputSchema,
  webhookSubscriptionUpdateSchema,
} from "@stockops/core/schemas";
import type {
  AppState,
  AppSnapshot,
  AuthContext,
  AuditLog,
  BillOfMaterial,
  BomComponent,
  CreditNote,
  InvoiceStatus,
  PaymentMethod,
  Customer,
  CustomFieldValue,
  ExtensionWebhookSubscription,
  Invoice,
  IntegrationSyncLog,
  InvoiceLine,
  ManufacturingOrder,
  Member,
  NotificationDelivery,
  Payment,
  Product,
  PurchaseOrder,
  Role,
  SalesOrder,
  Session,
  StockMovement,
  Supplier,
  WebhookEvent,
  Warehouse,
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

// In demo mode the in-memory session store does not survive serverless cold
// starts and is not shared across instances — opening a second tab can land
// on a different lambda that has no record of the session, and the user gets
// bounced to /sign-in. To fix that without re-introducing the previous
// guessable-token forgery, we sign the demo session with HMAC-SHA256 using a
// process-wide secret. Every instance with the same SESSION_SECRET can
// verify a token without any shared state.
//
// Token format: "<userId>.<organizationId>.<expiresAtIsoEpochMs>.<sig>"
// where sig = HMAC-SHA256(SESSION_SECRET, "<userId>.<organizationId>.<exp>")
// base64url-encoded.
//
// In production (database mode) this is unused — Prisma sessions handle it.

const DEMO_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (typeof secret === "string" && secret.length >= 16) {
    return secret;
  }
  return null;
}

function signDemoToken(payload: string): string {
  const secret = getSessionSecret();
  if (!secret) {
    // No secret configured → fall back to opaque random tokens (single-instance).
    return "";
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function verifyDemoSignature(payload: string, signature: string): boolean {
  const secret = getSessionSecret();
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(payload).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(expected, provided);
}

function buildSignedDemoToken(userId: string, organizationId: string, expiresAt: number) {
  const payload = `${userId}.${organizationId}.${expiresAt}`;
  const signature = signDemoToken(payload);
  if (!signature) return null;
  return `${payload}.${signature}`;
}

type DemoTokenClaims = {
  userId: string;
  organizationId: string;
  expiresAt: number;
};

function parseSignedDemoToken(token: string): DemoTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, organizationId, expiresAtRaw, signature] = parts;
  if (!userId || !organizationId || !expiresAtRaw || !signature) return null;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  const payload = `${userId}.${organizationId}.${expiresAtRaw}`;
  if (!verifyDemoSignature(payload, signature)) return null;
  return { userId, organizationId, expiresAt };
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
  const members: Member[] = appState.memberships
    .filter((m) => m.organizationId === organization.id)
    .map((m) => {
      const memberUser = appState.users.find((u) => u.id === m.userId);
      return {
        id: `mem_${m.userId}_${m.organizationId}`,
        userId: m.userId,
        name: memberUser?.name ?? "",
        email: memberUser?.email ?? "",
        role: m.role,
        createdAt: new Date().toISOString(),
      };
    });
  const stockRows = buildStockRows(products, warehouses, stockMovements);
  const criticalRows = stockRows.filter((row) => row.isCritical);

  return {
    organization,
    user,
    role,
    warehouses,
    products,
    suppliers,
    members,
    stockMovements,
    salesOrders,
    purchaseOrders,
    salesReturns: [],
    productVariants: [],
    billsOfMaterial: (appState.billsOfMaterial ?? []).filter(
      (b) => b.organizationId === organization.id,
    ),
    manufacturingOrders: (appState.manufacturingOrders ?? []).filter(
      (m) => m.organizationId === organization.id,
    ),
    stockRows,
    criticalRows,
    openSalesOrders: getOpenSalesOrders(salesOrders),
    openPurchaseOrders: getOpenPurchaseOrders(purchaseOrders),
    auditLogs: appState.auditLogs.slice(0, 8),
    webhookEvents: (appState.webhookEvents ?? [])
      .filter((event) => event.organizationId === organization.id)
      .slice(0, 12) as WebhookEvent[],
    integrationSyncLogs: (appState.integrationSyncLogs ?? [])
      .filter((log) => log.organizationId === organization.id)
      .slice(0, 25) as IntegrationSyncLog[],
    webhookSubscriptions: (appState.webhookSubscriptions ?? []).filter(
      (subscription) => subscription.organizationId === organization.id,
    ),
    customFields: (appState.customFields ?? [])
      .filter((field) => field.organizationId === organization.id)
      .slice(0, 25),
    exchangeRates: (appState.exchangeRates ?? [])
      .filter((rate) => rate.id || rate.baseCurrency)
      .slice(0, 40),
    notificationDeliveries: (appState.notificationDeliveries ?? [])
      .filter((delivery) => delivery.organizationId === organization.id)
      .slice(0, 12) as NotificationDelivery[],
    permissions: {
      canManageUsers: can(role, "manage_users"),
      canManageProducts: can(role, "manage_products"),
      canManageStock: can(role, "manage_stock"),
      canManageSales: can(role, "manage_sales"),
      canManagePurchasing: can(role, "manage_purchasing"),
    },
  };
}

export function getDemoCustomers(context?: AuthContext) {
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);

  return appState.customers.filter(
    (customer) => customer.organizationId === snapshotContext.organization.id,
  );
}

export function getDemoInvoices(context?: AuthContext) {
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);

  return appState.invoices.filter(
    (invoice) => invoice.organizationId === snapshotContext.organization.id,
  );
}

export function getDemoInvoice(invoiceId: string, context?: AuthContext) {
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization } = snapshotContext;

  const invoice = appState.invoices.find(
    (inv) => inv.id === invoiceId && inv.organizationId === organization.id,
  );
  if (!invoice) return null;
  
  const payments = appState.payments?.filter(p => p.invoiceId === invoice.id) || [];
  const customer = appState.customers.find(c => c.id === invoice.customerId);
  
  return {
    ...invoice,
    payments,
    customer,
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
  const expiresAtMs = Date.now() + DEMO_SESSION_TTL_MS;
  // Prefer a stateless HMAC-signed token so any serverless instance can
  // verify the session without shared memory. If no SESSION_SECRET is set
  // we fall back to opaque random bytes (single-instance only).
  const signed = buildSignedDemoToken(userId, organizationId, expiresAtMs);
  const token = signed ?? randomBytes(32).toString("base64url");

  const session: Session = {
    id: id("ses"),
    userId,
    organizationId,
    tokenHash: hashToken(token),
    expiresAt: new Date(expiresAtMs).toISOString(),
    createdAt: new Date().toISOString(),
  };

  // Still record in memory so deleteDemoSession can revoke on this instance
  // and so authenticated calls feel snappy.
  state().sessions.unshift(session);

  return { token, session };
}

export function getDemoAuthContext(token: string) {
  const appState = state();
  const tokenHash = hashToken(token);
  let session = appState.sessions.find((item) => item.tokenHash === tokenHash);

  // If this instance has no record of the session, fall back to verifying
  // the token's HMAC signature. This is what lets a second tab opened on a
  // different serverless instance keep its session — without re-introducing
  // the old "any string starting with demo_ is valid" forgery, since only
  // tokens signed with SESSION_SECRET will verify.
  if (!session) {
    const claims = parseSignedDemoToken(token);
    if (claims) {
      session = {
        id: id("ses"),
        userId: claims.userId,
        organizationId: claims.organizationId,
        tokenHash,
        expiresAt: new Date(claims.expiresAt).toISOString(),
        createdAt: new Date().toISOString(),
      };
      appState.sessions.unshift(session);
    }
  }

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
    unitPrice: 0,
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

export function createStockTransfer(input: unknown, context?: AuthContext) {
  const parsed = stockTransferInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_stock")) {
    throw new Error("Bu rol stok transferi olusturamaz.");
  }

  const product = appState.products.find(
    (item) =>
      item.id === parsed.productId &&
      item.isActive &&
      item.organizationId === organization.id,
  );
  const sourceWarehouse = appState.warehouses.find(
    (item) =>
      item.id === parsed.sourceWarehouseId &&
      item.organizationId === organization.id,
  );
  const destinationWarehouse = appState.warehouses.find(
    (item) =>
      item.id === parsed.destinationWarehouseId &&
      item.organizationId === organization.id,
  );

  if (!product || !sourceWarehouse || !destinationWarehouse) {
    throw new Error("Urun veya depo bulunamadi.");
  }

  assertEnoughStock(appState.stockMovements, parsed.sourceWarehouseId, [
    { productId: parsed.productId, quantity: parsed.quantity },
  ]);

  const reference = code(
    "TR",
    appState.stockMovements.filter((movement) => movement.type === "TRANSFER")
      .length / 2,
  );
  const createdAt = new Date().toISOString();
  const movements: StockMovement[] = [
    {
      id: id("mov"),
      organizationId: organization.id,
      warehouseId: parsed.sourceWarehouseId,
      productId: parsed.productId,
      type: "TRANSFER",
      quantityChange: -parsed.quantity,
      reference,
      note: parsed.note || `Transfer to ${destinationWarehouse.name}`,
      createdById: user.id,
      createdAt,
    },
    {
      id: id("mov"),
      organizationId: organization.id,
      warehouseId: parsed.destinationWarehouseId,
      productId: parsed.productId,
      type: "TRANSFER",
      quantityChange: parsed.quantity,
      reference,
      note: parsed.note || `Transfer from ${sourceWarehouse.name}`,
      createdById: user.id,
      createdAt,
    },
  ];

  appState.stockMovements.unshift(...movements);
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "StockTransfer",
    entityId: reference,
    summary: `${reference} stok transferi olusturuldu`,
  });

  return { movements, reference };
}

export function createWarehouse(input: unknown, context?: AuthContext) {
  const parsed = warehouseInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_stock")) {
    throw new Error("Bu rol depo olusturamaz.");
  }

  const organizationWarehouses = appState.warehouses.filter(
    (warehouse) => warehouse.organizationId === organization.id,
  );
  const exists = organizationWarehouses.some(
    (warehouse) => warehouse.code === parsed.code,
  );

  if (exists) {
    throw new Error("Bu depo kodu zaten kayitli.");
  }

  const isDefault =
    parsed.isDefault === true || organizationWarehouses.length === 0;

  if (isDefault) {
    organizationWarehouses.forEach((warehouse) => {
      warehouse.isDefault = false;
    });
  }

  const warehouse: Warehouse = {
    id: id("wh"),
    organizationId: organization.id,
    code: parsed.code,
    name: parsed.name,
    isDefault,
  };

  appState.warehouses.push(warehouse);
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "Warehouse",
    entityId: warehouse.id,
    summary: `${warehouse.code} deposu olusturuldu`,
  });

  return warehouse;
}

export function updateWarehouse(
  warehouseId: string,
  input: unknown,
  context?: AuthContext,
) {
  const parsed = warehouseUpdateInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!warehouseId) {
    throw new Error("Depo bulunamadi.");
  }

  if (!can(membership.role, "manage_stock")) {
    throw new Error("Bu rol depo yonetemez.");
  }

  const organizationWarehouses = appState.warehouses.filter(
    (warehouse) => warehouse.organizationId === organization.id,
  );
  const warehouse = organizationWarehouses.find(
    (item) => item.id === warehouseId,
  );

  if (!warehouse) {
    throw new Error("Depo bulunamadi.");
  }

  if (
    parsed.code &&
    organizationWarehouses.some(
      (item) => item.id !== warehouse.id && item.code === parsed.code,
    )
  ) {
    throw new Error("Bu depo kodu zaten kayitli.");
  }

  if (parsed.isDefault === true) {
    organizationWarehouses.forEach((item) => {
      item.isDefault = item.id === warehouse.id;
    });
  }

  Object.assign(warehouse, {
    code: parsed.code ?? warehouse.code,
    name: parsed.name ?? warehouse.name,
  });
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "UPDATE",
    entityType: "Warehouse",
    entityId: warehouse.id,
    summary: `${warehouse.code} deposu guncellendi`,
  });

  return warehouse;
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

export function createCustomer(input: unknown, context?: AuthContext) {
  const parsed = customerInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_sales")) {
    throw new Error("Bu rol musteri olusturamaz.");
  }

  const exists = appState.customers.some(
    (customer) =>
      customer.organizationId === organization.id &&
      customer.code === parsed.code,
  );

  if (exists) {
    throw new Error("Bu musteri kodu zaten kayitli.");
  }

  const customer: Customer = {
    id: id("cus"),
    organizationId: organization.id,
    code: parsed.code,
    name: parsed.name,
    email: parsed.email || undefined,
    phone: parsed.phone || undefined,
    taxId: parsed.taxId || undefined,
    address: parsed.address || undefined,
    paymentTermDays: parsed.paymentTermDays,
    isActive: true,
  };

  appState.customers.unshift(customer);
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "Customer",
    entityId: customer.id,
    summary: `${customer.name} musterisi olusturuldu`,
  });

  return customer;
}

export function createInvoice(input: unknown, context?: AuthContext) {
  const parsed = invoiceInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_sales")) {
    throw new Error("Bu rol fatura olusturamaz.");
  }

  const customer = appState.customers.find(
    (item) =>
      item.id === parsed.customerId && item.organizationId === organization.id,
  );

  if (!customer) {
    throw new Error("Musteri bulunamadi.");
  }

  const subtotal = parsed.lines.reduce((sum, line) => {
    const discountRate = (line.discount ?? 0) / 100;
    return sum + line.quantity * line.unitPrice * (1 - discountRate);
  }, 0);
  const taxAmount = subtotal * parsed.taxRate;
  const total = subtotal + taxAmount;
  const lines: InvoiceLine[] = parsed.lines.map((line) => {
    const discountRate = (line.discount ?? 0) / 100;
    return {
      productId: line.productId,
      description: line.description || undefined,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount ?? 0,
      lineTotal: line.quantity * line.unitPrice * (1 - discountRate),
    };
  });
  const invoice: Invoice = {
    id: id("inv"),
    organizationId: organization.id,
    customerId: customer.id,
    code: code("INV", appState.invoices.length),
    status: "DRAFT",
    dueDate: parsed.dueDate || undefined,
    subtotal,
    discountAmount: 0,
    taxRate: parsed.taxRate,
    taxAmount,
    total,
    currency: parsed.currency,
    notes: parsed.notes || undefined,
    lines,
    createdAt: new Date().toISOString(),
  };

  appState.invoices.unshift(invoice);
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "Invoice",
    entityId: invoice.id,
    summary: `${invoice.code} faturasi olusturuldu`,
  });

  return invoice;
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

  const orderLines: { productId: string; quantity: number }[] =
    parsed.lines && parsed.lines.length > 0
      ? parsed.lines
      : parsed.productId && parsed.quantity
        ? [{ productId: parsed.productId, quantity: parsed.quantity }]
        : [];

  const order: SalesOrder = {
    id: id("so"),
    organizationId: organization.id,
    code: code("SO", appState.salesOrders.length),
    customerName: parsed.customerName,
    status: "DRAFT",
    lines: orderLines,
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

export function updateOrganizationSettings(input: unknown, context?: AuthContext) {
  const parsed = organizationSettingsInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const organization = appState.organizations.find(
    (item) => item.id === snapshotContext.organization.id,
  );

  if (!organization) {
    throw new Error("Organization not found.");
  }

  organization.defaultCurrency = parsed.defaultCurrency;
  organization.locale = parsed.locale;
  return organization;
}

export function recordStocktakeCount(input: unknown, context?: AuthContext) {
  const parsed = stocktakeCountInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_stock")) {
    throw new Error("Bu rol sayim kaydi olusturamaz.");
  }

  const onHand = getStockOnHand(
    appState.stockMovements,
    parsed.productId,
    parsed.warehouseId,
  );
  const quantityChange = parsed.countedQuantity - onHand;

  const movement: StockMovement = {
    id: id("mov"),
    organizationId: organization.id,
    warehouseId: parsed.warehouseId,
    productId: parsed.productId,
    type: "ADJUSTMENT",
    quantityChange,
    reference: `STK-${Date.now()}`,
    note: parsed.note || `Stocktake count ${parsed.countedQuantity}`,
    createdById: user.id,
    createdAt: new Date().toISOString(),
  };

  appState.stockMovements.unshift(movement);
  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "STOCKTAKE",
    entityType: "StockMovement",
    entityId: movement.id,
    summary: `Stocktake adjusted by ${quantityChange}`,
  });

  return movement;
}

export function createWebhookSubscription(
  input: unknown,
  context?: AuthContext,
) {
  const parsed = webhookSubscriptionInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization } = snapshotContext;
  const subscription: ExtensionWebhookSubscription = {
    id: id("extwh"),
    organizationId: organization.id,
    url: parsed.url,
    events: parsed.events,
    secret: parsed.secret || undefined,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  appState.webhookSubscriptions ??= [];
  appState.webhookSubscriptions.unshift(subscription);
  return subscription;
}

export function updateWebhookSubscription(
  subscriptionId: string,
  input: unknown,
  context?: AuthContext,
) {
  const parsed = webhookSubscriptionUpdateSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const subscription = (appState.webhookSubscriptions ?? []).find(
    (item) =>
      item.id === subscriptionId &&
      item.organizationId === snapshotContext.organization.id,
  );

  if (!subscription) {
    throw new Error("Webhook subscription not found.");
  }

  subscription.url = parsed.url ?? subscription.url;
  subscription.events = parsed.events ?? subscription.events;
  subscription.secret =
    parsed.secret === undefined ? subscription.secret : parsed.secret || undefined;
  subscription.status = parsed.status ?? subscription.status;
  subscription.updatedAt = new Date().toISOString();
  return subscription;
}

export function upsertCustomField(
  entityType: string,
  entityId: string,
  input: unknown,
  context?: AuthContext,
) {
  const parsed = customFieldInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization } = snapshotContext;
  appState.customFields ??= [];

  const existing = appState.customFields.find(
    (field) =>
      field.organizationId === organization.id &&
      field.entityType === entityType &&
      field.entityId === entityId &&
      field.key === parsed.key,
  );

  if (existing) {
    existing.value = parsed.value;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  const field: CustomFieldValue = {
    id: id("cf"),
    organizationId: organization.id,
    entityType,
    entityId,
    key: parsed.key,
    value: parsed.value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  appState.customFields.unshift(field);
  return field;
}

export function createUser(input: unknown, context?: AuthContext) {
  const parsed = userInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_users")) {
    throw new Error("Bu rol kullanıcı yönetemez.");
  }

  const existingUser = appState.users.find(
    (u) => u.email.toLowerCase() === parsed.email.toLowerCase(),
  );

  if (existingUser) {
    const existingMembership = appState.memberships.find(
      (m) =>
        m.userId === existingUser.id &&
        m.organizationId === organization.id,
    );

    if (existingMembership) {
      throw new Error("Bu e-posta adresi zaten kayıtlı.");
    }
  }

  const newUser = existingUser ?? {
    id: id("usr"),
    name: parsed.name,
    email: parsed.email,
    passwordHash: hashPassword(parsed.password),
  };

  if (!existingUser) {
    appState.users.push(newUser);
  }

  appState.memberships.push({
    organizationId: organization.id,
    userId: newUser.id,
    role: parsed.role as Role,
  });

  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "User",
    entityId: newUser.id,
    summary: `${parsed.name} kullanıcısı ${parsed.role} rolüyle eklendi`,
  });

  return newUser;
}

export function updateUserRole(
  membershipId: string,
  input: unknown,
  context?: AuthContext,
) {
  const parsed = userUpdateRoleSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const ctxMembership = getMembershipForContext(appState, snapshotContext);

  if (!can(ctxMembership.role, "manage_users")) {
    throw new Error("Bu rol kullanıcı yönetemez.");
  }

  const targetMembership = appState.memberships.find(
    (m) =>
      `mem_${m.userId}_${m.organizationId}` === membershipId &&
      m.organizationId === organization.id,
  );

  if (!targetMembership) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  if (targetMembership.userId === user.id) {
    throw new Error("Kendi rolünüzü değiştiremezsiniz.");
  }

  const targetUser = appState.users.find((u) => u.id === targetMembership.userId);
  targetMembership.role = parsed.role as Role;

  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "UPDATE",
    entityType: "User",
    entityId: targetMembership.userId,
    summary: `${targetUser?.name} kullanıcısının rolü ${parsed.role} olarak güncellendi`,
  });
}

export function deleteUser(membershipId: string, context?: AuthContext) {
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const ctxMembership = getMembershipForContext(appState, snapshotContext);

  if (!can(ctxMembership.role, "manage_users")) {
    throw new Error("Bu rol kullanıcı yönetemez.");
  }

  const targetIndex = appState.memberships.findIndex(
    (m) =>
      `mem_${m.userId}_${m.organizationId}` === membershipId &&
      m.organizationId === organization.id,
  );

  if (targetIndex === -1) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  const targetMembership = appState.memberships[targetIndex];

  if (targetMembership.userId === user.id) {
    throw new Error("Kendinizi silemezsiniz.");
  }

  const targetUser = appState.users.find((u) => u.id === targetMembership.userId);
  appState.memberships.splice(targetIndex, 1);

  appState.sessions = appState.sessions.filter(
    (s) =>
      !(
        s.userId === targetMembership.userId &&
        s.organizationId === organization.id
      ),
  );

  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "UPDATE",
    entityType: "User",
    entityId: targetMembership.userId,
    summary: `${targetUser?.name} kullanıcısı organizasyondan çıkarıldı`,
  });
}

// ── BOM + Manufacturing ──

export function createBom(input: unknown, context?: AuthContext) {
  const parsed = bomInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_products")) {
    throw new Error("Bu rol ürün reçetesi oluşturamaz.");
  }

  const product = appState.products.find(
    (p) => p.id === parsed.productId && p.organizationId === organization.id,
  );
  if (!product) throw new Error("Ürün bulunamadı.");

  const existing = (appState.billsOfMaterial ?? []).find(
    (b) => b.productId === parsed.productId && b.organizationId === organization.id,
  );
  if (existing) throw new Error("Bu ürün için zaten bir reçete mevcut.");

  const bomId = id("bom");
  const components: BomComponent[] = parsed.components.map((c, i) => ({
    id: id("bomc"),
    bomId,
    componentProductId: c.componentProductId,
    quantity: c.quantity,
    sortOrder: c.sortOrder ?? i,
  }));

  const bom: BillOfMaterial = {
    id: bomId,
    organizationId: organization.id,
    productId: parsed.productId,
    name: parsed.name,
    description: parsed.description,
    isActive: true,
    components,
  };

  appState.billsOfMaterial ??= [];
  appState.billsOfMaterial.unshift(bom);

  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "BillOfMaterial",
    entityId: bom.id,
    summary: `${bom.name} reçetesi oluşturuldu (${product.sku})`,
  });

  return bom;
}

export function updateBom(bomId: string, input: unknown, context?: AuthContext) {
  const parsed = bomUpdateInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_products")) {
    throw new Error("Bu rol ürün reçetesi düzenleyemez.");
  }

  const bom = (appState.billsOfMaterial ?? []).find(
    (b) => b.id === bomId && b.organizationId === organization.id,
  );
  if (!bom) throw new Error("Reçete bulunamadı.");

  if (parsed.name) bom.name = parsed.name;
  if (parsed.description !== undefined) bom.description = parsed.description;
  if (parsed.components) {
    bom.components = parsed.components.map((c, i) => ({
      id: id("bomc"),
      bomId: bom.id,
      componentProductId: c.componentProductId,
      quantity: c.quantity,
      sortOrder: c.sortOrder ?? i,
    }));
  }

  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "UPDATE",
    entityType: "BillOfMaterial",
    entityId: bom.id,
    summary: `${bom.name} reçetesi güncellendi`,
  });

  return bom;
}

export function createManufacturingOrder(input: unknown, context?: AuthContext) {
  const parsed = manufacturingOrderInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_stock")) {
    throw new Error("Bu rol üretim emri oluşturamaz.");
  }

  const bom = (appState.billsOfMaterial ?? []).find(
    (b) => b.id === parsed.bomId && b.organizationId === organization.id,
  );
  if (!bom) throw new Error("Reçete bulunamadı.");

  const warehouse = appState.warehouses.find(
    (w) => w.id === parsed.warehouseId && w.organizationId === organization.id,
  );
  if (!warehouse) throw new Error("Depo bulunamadı.");

  const moCount = (appState.manufacturingOrders ?? []).length;
  const mo: ManufacturingOrder = {
    id: id("mo"),
    organizationId: organization.id,
    bomId: parsed.bomId,
    warehouseId: parsed.warehouseId,
    code: code("MO", moCount),
    quantity: parsed.quantity,
    status: "DRAFT",
    createdAt: new Date().toISOString(),
  };

  appState.manufacturingOrders ??= [];
  appState.manufacturingOrders.unshift(mo);

  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "ManufacturingOrder",
    entityId: mo.id,
    summary: `${mo.code} üretim emri oluşturuldu`,
  });

  return mo;
}

export function startManufacturingOrder(moId: string, context?: AuthContext) {
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_stock")) {
    throw new Error("Bu rol üretim emri başlatamaz.");
  }

  const mo = (appState.manufacturingOrders ?? []).find(
    (m) => m.id === moId && m.organizationId === organization.id,
  );
  if (!mo) throw new Error("Üretim emri bulunamadı.");
  if (mo.status !== "DRAFT") throw new Error("Sadece taslak üretim emirleri başlatılabilir.");

  const bom = (appState.billsOfMaterial ?? []).find((b) => b.id === mo.bomId);
  if (!bom) throw new Error("Reçete bulunamadı.");

  // Consume raw materials
  for (const comp of bom.components) {
    const consumeQty = comp.quantity * mo.quantity;
    assertEnoughStock(appState.stockMovements, mo.warehouseId, [
      { productId: comp.componentProductId, quantity: consumeQty },
    ]);

    appState.stockMovements.unshift({
      id: id("mov"),
      organizationId: organization.id,
      warehouseId: mo.warehouseId,
      productId: comp.componentProductId,
      type: "MANUFACTURE_CONSUME",
      quantityChange: -consumeQty,
      reference: mo.code,
      note: "Üretim hammadde tüketimi",
      createdById: user.id,
      createdAt: new Date().toISOString(),
    });
  }

  mo.status = "IN_PROGRESS";
  mo.startedAt = new Date().toISOString();

  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "UPDATE",
    entityType: "ManufacturingOrder",
    entityId: mo.id,
    summary: `${mo.code} üretim başlatıldı, hammaddeler tüketildi`,
  });
}

export function completeManufacturingOrder(moId: string, context?: AuthContext) {
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;
  const membership = getMembershipForContext(appState, snapshotContext);

  if (!can(membership.role, "manage_stock")) {
    throw new Error("Bu rol üretim emri tamamlayamaz.");
  }

  const mo = (appState.manufacturingOrders ?? []).find(
    (m) => m.id === moId && m.organizationId === organization.id,
  );
  if (!mo) throw new Error("Üretim emri bulunamadı.");
  if (mo.status !== "IN_PROGRESS") throw new Error("Sadece üretimde olan emirler tamamlanabilir.");

  const bom = (appState.billsOfMaterial ?? []).find((b) => b.id === mo.bomId);
  if (!bom) throw new Error("Reçete bulunamadı.");

  // Produce finished goods
  appState.stockMovements.unshift({
    id: id("mov"),
    organizationId: organization.id,
    warehouseId: mo.warehouseId,
    productId: bom.productId,
    type: "MANUFACTURE_PRODUCE",
    quantityChange: mo.quantity,
    reference: mo.code,
    note: "Üretim çıktısı",
    createdById: user.id,
    createdAt: new Date().toISOString(),
  });

  mo.status = "COMPLETED";
  mo.completedAt = new Date().toISOString();

  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "UPDATE",
    entityType: "ManufacturingOrder",
    entityId: mo.id,
    summary: `${mo.code} üretim tamamlandı, mamul stoka eklendi`,
  });
}

export function recordDemoPayment(
  invoiceId: string,
  input: unknown,
  context?: AuthContext,
) {
  const parsed = paymentInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;

  const invoice = appState.invoices.find((inv) => inv.id === invoiceId && inv.organizationId === organization.id);
  if (!invoice) {
    throw new Error("Fatura bulunamadı.");
  }

  if (!appState.payments) {
    appState.payments = [];
  }

  const payment: Payment = {
    id: id("pay"),
    organizationId: organization.id,
    invoiceId: invoice.id,
    amount: parsed.amount,
    method: parsed.method as PaymentMethod,
    reference: parsed.reference,
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  appState.payments.push(payment);

  const invoicePayments = appState.payments.filter((p) => p.invoiceId === invoice.id);
  const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);

  if (totalPaid >= invoice.total) {
    invoice.status = "PAID";
  } else if (totalPaid > 0) {
    invoice.status = "PARTIALLY_PAID";
  }

  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "Payment",
    entityId: payment.id,
    summary: `${invoice.code} için ödeme alındı: ${parsed.amount}`,
  });

  return payment;
}

export function transitionDemoInvoiceStatus(
  invoiceId: string,
  targetStatus: string,
  context?: AuthContext,
) {
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;

  const invoice = appState.invoices.find((inv) => inv.id === invoiceId && inv.organizationId === organization.id);
  if (!invoice) {
    throw new Error("Fatura bulunamadı.");
  }

  invoice.status = targetStatus as InvoiceStatus;

  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "UPDATE",
    entityType: "Invoice",
    entityId: invoice.id,
    summary: `${invoice.code} durumu güncellendi: ${targetStatus}`,
  });

  return invoice;
}

export function getDemoCreditNotes(context?: AuthContext) {
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization } = snapshotContext;

  return (appState.creditNotes || []).filter(
    (note) => note.organizationId === organization.id,
  );
}

export function createDemoCreditNote(input: unknown, context?: AuthContext) {
  const parsed = creditNoteInputSchema.parse(input);
  const appState = state();
  const snapshotContext = context ?? getDemoSnapshotContext(appState);
  const { organization, user } = snapshotContext;

  if (!appState.creditNotes) {
    appState.creditNotes = [];
  }

  const count = appState.creditNotes.filter(
    (n) => n.organizationId === organization.id,
  ).length;

  const linesWithTotals = parsed.lines.map((line) => {
    return {
      ...line,
      lineTotal: line.quantity * line.unitPrice,
    };
  });

  const totalAmount = linesWithTotals.reduce(
    (sum, line) => sum + line.lineTotal,
    0,
  );

  const note: CreditNote = {
    id: id("cn"),
    organizationId: organization.id,
    customerId: parsed.customerId,
    salesReturnId: parsed.salesReturnId,
    code: code("CN", count),
    status: "DRAFT",
    totalAmount,
    appliedAmount: 0,
    notes: parsed.notes,
    lines: linesWithTotals,
    createdAt: new Date().toISOString(),
  };

  appState.creditNotes.unshift(note);

  audit({
    organizationId: organization.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "CreditNote",
    entityId: note.id,
    summary: `${note.code} kredi notu oluşturuldu`,
  });

  return note;
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
