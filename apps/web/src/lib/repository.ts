/* eslint-disable @typescript-eslint/no-explicit-any */
import { can } from "@stockops/core/inventory";
import { getDataSourceMode } from "@/lib/data-source";
import { globalPluginManager } from "@stockops/core/extensions";
import type { SuggestedPurchaseOrder } from "@stockops/core/forecast";
import {
  completeManufacturingOrder as completeDemoMo,
  confirmSalesOrder as confirmDemoSalesOrder,
  createBom as createDemoBom,
  createManufacturingOrder as createDemoMo,
  createProduct as createDemoProduct,
  createPurchaseOrder as createDemoPurchaseOrder,
  createSalesOrder as createDemoSalesOrder,
  createStockMovement as createDemoStockMovement,
  createStockTransfer as createDemoStockTransfer,
  createSupplier as createDemoSupplier,
  createWebhookSubscription as createDemoWebhookSubscription,
  createUser as createDemoUser,
  createWarehouse as createDemoWarehouse,
  deleteUser as deleteDemoUser,
  getDemoSnapshot,
  receivePurchaseOrder as receiveDemoPurchaseOrder,
  recordStocktakeCount as recordDemoStocktakeCount,
  setProductActive as setDemoProductActive,
  startManufacturingOrder as startDemoMo,
  updateOrganizationSettings as updateDemoOrganizationSettings,
  updateBom as updateDemoBom,
  updateProduct as updateDemoProduct,
  updateSupplier as updateDemoSupplier,
  updateUserRole as updateDemoUserRole,
  updateWarehouse as updateDemoWarehouse,
  updateWebhookSubscription as updateDemoWebhookSubscription,
  upsertCustomField as upsertDemoCustomField,
} from "@/lib/demo-store";
import { getPrisma } from "@/lib/prisma";
import {
  bomInputSchema,
  bomUpdateInputSchema,
  manufacturingOrderInputSchema,
  customFieldInputSchema,
  exchangeRateQuerySchema,
  organizationSettingsInputSchema,
  productInputSchema,
  productUpdateInputSchema,
  purchaseOrderInputSchema,
  salesOrderInputSchema,
  salesReturnInputSchema,
  stockMovementInputSchema,
  stocktakeCountInputSchema,
  stockTransferInputSchema,
  supplierInputSchema,
  supplierUpdateInputSchema,
  userInputSchema,
  userUpdateRoleSchema,
  variantInputSchema,
  variantUpdateInputSchema,
  warehouseInputSchema,
  warehouseUpdateInputSchema,
  webhookSubscriptionInputSchema,
  webhookSubscriptionUpdateSchema,
} from "@stockops/core/schemas";
import {
  parseEcbEuroRates,
  parseTcmbTryRates,
  crossRate,
} from "@stockops/core/currency";
import {
  assertEnoughStock,
  buildStockRows,
  getOpenPurchaseOrders,
  getOpenSalesOrders,
  getStockOnHand,
} from "@stockops/core/inventory";
import { hashPassword } from "@stockops/core/password";
import type {
  AppSnapshot,
  AuthContext,
  Member,
  NotificationDelivery,
  CustomFieldValue,
  ExchangeRate,
  ExtensionWebhookSubscription,
  ExtensionEventName,
  Product,
  ProductVariant,
  PurchaseOrder,
  PurchaseOrderLine,
  Role,
  SalesOrder,
  SalesReturn,
    StockMovement,
  StockMovementType,
  Supplier,
  WebhookEvent,
  Warehouse,
} from "@stockops/core/types";

function dbMode() {
  return getDataSourceMode() === "database";
}

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function ensurePermission(context: AuthContext, permission: Parameters<typeof can>[1]) {
  if (!can(context.role, permission)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
}

function ensureRecordId(recordId: string, label: string) {
  if (!recordId) {
    throw new Error(`${label} bulunamadi.`);
  }
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Error && error.message.includes("Unique constraint");
}

function mapProduct(product: {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  barcode: string | null;
  category: string;
  description: string | null;
  minimumStock: number;
  isActive: boolean;
   
  unitPrice?: any;
}): Product {
  return {
    id: product.id,
    organizationId: product.organizationId,
    sku: product.sku,
    name: product.name,
    barcode: product.barcode ?? undefined,
    category: product.category,
    description: product.description ?? undefined,
    minimumStock: product.minimumStock,
    isActive: product.isActive,
    unitPrice: product.unitPrice ? Number(product.unitPrice) : 0,
  };
}

function mapWarehouse(warehouse: {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  isDefault: boolean;
}): Warehouse {
  return {
    id: warehouse.id,
    organizationId: warehouse.organizationId,
    code: warehouse.code,
    name: warehouse.name,
    isDefault: warehouse.isDefault,
  };
}

function mapStockMovement(movement: {
  id: string;
  organizationId: string;
  warehouseId: string;
  productId: string;
  type: string;
  quantityChange: number;
  reference: string | null;
  note: string | null;
  createdById: string | null;
  createdAt: Date;
}): StockMovement {
  return {
    id: movement.id,
    organizationId: movement.organizationId,
    warehouseId: movement.warehouseId,
    productId: movement.productId,
    type: movement.type as StockMovementType,
    quantityChange: movement.quantityChange,
    reference: movement.reference ?? undefined,
    note: movement.note ?? undefined,
    createdById: movement.createdById ?? undefined,
    createdAt: iso(movement.createdAt),
  };
}

function mapWebhookEvent(event: {
  id: string;
  organizationId: string;
  source: string;
  topic: string;
  externalId: string | null;
  dedupeKey: string;
  status: string;
  payload: unknown;
  headers: unknown;
  error: string | null;
  attempts: number;
  receivedAt: Date;
  processedAt: Date | null;
}): WebhookEvent {
  return {
    id: event.id,
    organizationId: event.organizationId,
    source: event.source as WebhookEvent["source"],
    topic: event.topic,
    externalId: event.externalId ?? undefined,
    dedupeKey: event.dedupeKey,
    status: event.status as WebhookEvent["status"],
    payload: event.payload,
    headers:
      event.headers && typeof event.headers === "object"
        ? (event.headers as Record<string, string>)
        : undefined,
    error: event.error ?? undefined,
    attempts: event.attempts,
    receivedAt: iso(event.receivedAt),
    processedAt: event.processedAt ? iso(event.processedAt) : undefined,
  };
}

function mapNotificationDelivery(delivery: {
  id: string;
  organizationId: string;
  channel: string;
  provider: string;
  recipient: string | null;
  message: string;
  status: string;
  reason: string | null;
  error: string | null;
  createdAt: Date;
  sentAt: Date | null;
}): NotificationDelivery {
  return {
    id: delivery.id,
    organizationId: delivery.organizationId,
    channel: delivery.channel as NotificationDelivery["channel"],
    provider: delivery.provider,
    recipient: delivery.recipient ?? undefined,
    message: delivery.message,
    status: delivery.status as NotificationDelivery["status"],
    reason: delivery.reason ?? undefined,
    error: delivery.error ?? undefined,
    createdAt: iso(delivery.createdAt),
    sentAt: delivery.sentAt ? iso(delivery.sentAt) : undefined,
  };
}

function mapWebhookSubscription(subscription: {
  id: string;
  organizationId: string;
  url: string;
  events: unknown;
  secret: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): ExtensionWebhookSubscription {
  return {
    id: subscription.id,
    organizationId: subscription.organizationId,
    url: subscription.url,
    events: Array.isArray(subscription.events)
      ? (subscription.events as ExtensionEventName[])
      : [],
    secret: subscription.secret ?? undefined,
    status: subscription.status as ExtensionWebhookSubscription["status"],
    createdAt: iso(subscription.createdAt),
    updatedAt: iso(subscription.updatedAt),
  };
}

function mapCustomField(field: {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}): CustomFieldValue {
  return {
    id: field.id,
    organizationId: field.organizationId,
    entityType: field.entityType,
    entityId: field.entityId,
    key: field.key,
    value: field.value,
    createdAt: iso(field.createdAt),
    updatedAt: iso(field.updatedAt),
  };
}

function mapExchangeRate(rate: {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: unknown;
  provider: string;
  observedAt: Date;
  createdAt: Date;
}): ExchangeRate {
  return {
    id: rate.id,
    baseCurrency: rate.baseCurrency,
    quoteCurrency: rate.quoteCurrency,
    rate: Number(rate.rate),
    provider: rate.provider as ExchangeRate["provider"],
    observedAt: iso(rate.observedAt),
    createdAt: iso(rate.createdAt),
  };
}

export async function getAppSnapshot(
  context: AuthContext,
): Promise<AppSnapshot> {
  if (!dbMode()) {
    return getDemoSnapshot(context);
  }

  const prisma = getPrisma();
  const organizationId = context.organization.id;
  const [
    warehouses,
    products,
    suppliers,
    stockMovements,
    salesOrders,
    purchaseOrders,
    salesReturns,
    productVariants,
    auditLogs,
    webhookEvents,
    webhookSubscriptions,
    customFields,
    exchangeRates,
    notificationDeliveries,
    memberships,
    billsOfMaterial,
    manufacturingOrders,
  ] = await Promise.all([
    prisma.warehouse.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { organizationId },
      include: { products: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.salesOrder.findMany({
      where: { organizationId },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.purchaseOrder.findMany({
      where: { organizationId },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salesReturn.findMany({
      where: { organizationId },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productVariant.findMany({
      where: { product: { organizationId } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.webhookEvent.findMany({
      where: { organizationId },
      orderBy: { receivedAt: "desc" },
      take: 12,
    }),
    (prisma as any).extensionWebhookSubscription?.findMany?.({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 25,
    }).catch(() => []) ?? Promise.resolve([]),
    (prisma as any).customField?.findMany?.({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      take: 25,
    }).catch(() => []) ?? Promise.resolve([]),
    (prisma as any).exchangeRate?.findMany?.({
      where: { organizationId },
      orderBy: [{ observedAt: "desc" }, { quoteCurrency: "asc" }],
      take: 40,
    }).catch(() => []) ?? Promise.resolve([]),
    prisma.notificationDelivery.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.membership.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    // BOM + Manufacturing (may not exist if migration not run)
    (prisma as any).billOfMaterial?.findMany?.({
      where: { organizationId },
      include: { components: true },
      orderBy: { createdAt: "desc" },
    }).catch(() => []) ?? Promise.resolve([]),
    (prisma as any).manufacturingOrder?.findMany?.({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    }).catch(() => []) ?? Promise.resolve([]),
  ]);

  const mappedProducts = products.map(mapProduct);
  const mappedWarehouses = warehouses.map(mapWarehouse);
  const mappedMovements = stockMovements.map(mapStockMovement);
  const mappedSuppliers: Supplier[] = suppliers.map((supplier) => ({
    id: supplier.id,
    organizationId: supplier.organizationId,
    name: supplier.name,
    contactName: supplier.contactName ?? undefined,
    email: supplier.email ?? undefined,
    phone: supplier.phone ?? undefined,
    leadTimeDays: supplier.leadTimeDays,
    productIds: supplier.products.map((item) => item.productId),
  }));
  const mappedSalesOrders: SalesOrder[] = salesOrders.map((order) => ({
    id: order.id,
    organizationId: order.organizationId,
    code: order.code,
    customerName: order.customerName,
    status: order.status,
    createdAt: iso(order.createdAt),
    lines: order.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
    })),
  }));
  const mappedPurchaseOrders: PurchaseOrder[] = purchaseOrders.map((order) => ({
    id: order.id,
    organizationId: order.organizationId,
    code: order.code,
    supplierId: order.supplierId,
    status: order.status,
    expectedDate: order.expectedDate?.toISOString(),
    createdAt: iso(order.createdAt),
    lines: order.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      receivedQuantity: line.receivedQuantity,
    })),
  }));
  const mappedMembers: Member[] = memberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    role: m.role as Role,
    createdAt: iso(m.createdAt),
  }));
  const stockRows = buildStockRows(
    mappedProducts,
    mappedWarehouses,
    mappedMovements,
  );

  const mappedSalesReturns: SalesReturn[] = salesReturns.map((salesReturn) => ({
    id: salesReturn.id,
    organizationId: salesReturn.organizationId,
    salesOrderId: salesReturn.salesOrderId,
    code: salesReturn.code,
    reason: salesReturn.reason ?? undefined,
    status: salesReturn.status,
    createdAt: iso(salesReturn.createdAt),
    lines: salesReturn.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      restocked: line.restocked,
    })),
  }));
  const mappedProductVariants: ProductVariant[] = productVariants.map(
    (variant) => ({
      id: variant.id,
      productId: variant.productId,
      sku: variant.sku,
      name: variant.name,
      barcode: variant.barcode ?? undefined,
      unitPrice: Number(variant.unitPrice),
      costPrice: variant.costPrice ? Number(variant.costPrice) : undefined,
      weight: variant.weight ? Number(variant.weight) : undefined,
      isActive: variant.isActive,
      attributes: (variant.attributes as Record<string, string>) ?? {},
    }),
  );

  return {
    organization: context.organization,
    user: context.user,
    role: context.role,
    warehouses: mappedWarehouses,
    products: mappedProducts,
    suppliers: mappedSuppliers,
    members: mappedMembers,
    stockMovements: mappedMovements,
    salesOrders: mappedSalesOrders,
    purchaseOrders: mappedPurchaseOrders,
    salesReturns: mappedSalesReturns,
    productVariants: mappedProductVariants,
    stockRows,
    criticalRows: stockRows.filter((row) => row.isCritical),
    openSalesOrders: getOpenSalesOrders(mappedSalesOrders),
    openPurchaseOrders: getOpenPurchaseOrders(mappedPurchaseOrders),
    auditLogs: auditLogs.map((auditLog) => ({
      id: auditLog.id,
      organizationId: auditLog.organizationId,
      actorId: auditLog.actorId ?? undefined,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      summary: auditLog.summary,
      createdAt: iso(auditLog.createdAt),
    })),
     
    billsOfMaterial: billsOfMaterial.map((b: any) => ({
      id: b.id,
      organizationId: b.organizationId,
      productId: b.productId,
      name: b.name,
      description: b.description ?? undefined,
      isActive: b.isActive,
       
      components: (b.components ?? []).map((c: any) => ({
        id: c.id,
        bomId: c.bomId,
        componentProductId: c.componentProductId,
        quantity: Number(c.quantity),
        sortOrder: c.sortOrder,
      })),
    })),
     
    manufacturingOrders: manufacturingOrders.map((m: any) => ({
      id: m.id,
      organizationId: m.organizationId,
      bomId: m.bomId,
      warehouseId: m.warehouseId,
      code: m.code,
      quantity: m.quantity,
      status: m.status as import("@stockops/core/types").ManufacturingOrderStatus,
      startedAt: m.startedAt ? iso(m.startedAt) : undefined,
      completedAt: m.completedAt ? iso(m.completedAt) : undefined,
      createdAt: iso(m.createdAt),
    })),
    webhookEvents: webhookEvents.map(mapWebhookEvent),
     
    webhookSubscriptions: webhookSubscriptions.map((item: any) =>
      mapWebhookSubscription(item),
    ),
     
    customFields: customFields.map((item: any) => mapCustomField(item)),
     
    exchangeRates: exchangeRates.map((item: any) => mapExchangeRate(item)),
    notificationDeliveries: notificationDeliveries.map(mapNotificationDelivery),
    permissions: {
      canManageUsers: can(context.role, "manage_users"),
      canManageProducts: can(context.role, "manage_products"),
      canManageStock: can(context.role, "manage_stock"),
      canManageSales: can(context.role, "manage_sales"),
      canManagePurchasing: can(context.role, "manage_purchasing"),
    },
  };
}

export async function updateOrganizationSettings(
  input: unknown,
  context: AuthContext,
) {
  if (!dbMode()) {
    return updateDemoOrganizationSettings(input, context);
  }

  ensurePermission(context, "manage_users");
  const parsed = organizationSettingsInputSchema.parse(input);
   
  const updated = await (getPrisma() as any).organization.update({
    where: { id: context.organization.id },
    data: {
      defaultCurrency: parsed.defaultCurrency,
      locale: parsed.locale,
    },
  });

  context.organization.defaultCurrency = updated.defaultCurrency;
  context.organization.locale = updated.locale;
  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    defaultCurrency: updated.defaultCurrency,
    locale: updated.locale,
  };
}

export async function recordStocktakeCount(
  input: unknown,
  context: AuthContext,
) {
  if (!dbMode()) {
    return recordDemoStocktakeCount(input, context);
  }

  ensurePermission(context, "manage_stock");
  const parsed = stocktakeCountInputSchema.parse(input);
  const prisma = getPrisma();
  const [product, warehouse, movements] = await Promise.all([
    prisma.product.findFirst({
      where: {
        id: parsed.productId,
        organizationId: context.organization.id,
        isActive: true,
      },
    }),
    prisma.warehouse.findFirst({
      where: { id: parsed.warehouseId, organizationId: context.organization.id },
    }),
    prisma.stockMovement.findMany({
      where: {
        organizationId: context.organization.id,
        productId: parsed.productId,
        warehouseId: parsed.warehouseId,
      },
    }),
  ]);

  if (!product || !warehouse) {
    throw new Error("Product or warehouse not found.");
  }

  const currentOnHand = getStockOnHand(
    movements.map(mapStockMovement),
    parsed.productId,
    parsed.warehouseId,
  );
  const quantityChange = parsed.countedQuantity - currentOnHand;
  const reference = `STK-${Date.now()}`;

  const movement = await prisma.$transaction(async (tx) => {
    const created = await tx.stockMovement.create({
      data: {
        organizationId: context.organization.id,
        warehouseId: parsed.warehouseId,
        productId: parsed.productId,
        type: "ADJUSTMENT",
        quantityChange,
        reference,
        note: parsed.note || `Stocktake count ${parsed.countedQuantity}`,
        createdById: context.user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
         
        action: "STOCKTAKE" as any,
        entityType: "StockMovement",
        entityId: created.id,
        summary: `${product.sku} stocktake adjusted by ${quantityChange}`,
      },
    });

    return created;
  });

  return mapStockMovement(movement);
}

export async function refreshExchangeRates(
  input: unknown,
  context: AuthContext,
) {
  if (!dbMode()) {
    return [];
  }

  ensurePermission(context, "manage_sales");
  const parsed = exchangeRateQuerySchema.parse(input ?? {});
  const provider = parsed.provider ?? (parsed.baseCurrency === "TRY" ? "TCMB" : "ECB");
  const rates =
    provider === "TCMB"
      ? parseTcmbTryRates(await fetchText("https://www.tcmb.gov.tr/kurlar/today.xml"))
      : parseEcbEuroRates(
          await fetchText(
            "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml",
          ),
        );

  const rate = crossRate(rates, parsed.baseCurrency, parsed.quoteCurrency);
  const observedAt =
    rates.find(
      (item) =>
        item.baseCurrency === parsed.baseCurrency ||
        item.quoteCurrency === parsed.quoteCurrency,
    )?.observedAt ?? new Date().toISOString();

  const prisma = getPrisma() as any;
  const saved = await prisma.exchangeRate.upsert({
    where: {
      organizationId_provider_baseCurrency_quoteCurrency_observedAt: {
        organizationId: context.organization.id,
        provider,
        baseCurrency: parsed.baseCurrency,
        quoteCurrency: parsed.quoteCurrency,
        observedAt: new Date(observedAt),
      },
    },
    update: { rate },
    create: {
      organizationId: context.organization.id,
      provider,
      baseCurrency: parsed.baseCurrency,
      quoteCurrency: parsed.quoteCurrency,
      rate,
      observedAt: new Date(observedAt),
    },
  });

  return mapExchangeRate(saved);
}

export async function createWebhookSubscription(
  input: unknown,
  context: AuthContext,
) {
  if (!dbMode()) {
    return createDemoWebhookSubscription(input, context);
  }

  ensurePermission(context, "manage_users");
  const parsed = webhookSubscriptionInputSchema.parse(input);
  const subscription = await (getPrisma() as any).extensionWebhookSubscription.create({
    data: {
      organizationId: context.organization.id,
      url: parsed.url,
      events: parsed.events,
      secret: parsed.secret || null,
    },
  });
  return mapWebhookSubscription(subscription);
}

export async function updateWebhookSubscription(
  subscriptionId: string,
  input: unknown,
  context: AuthContext,
) {
  if (!dbMode()) {
    return updateDemoWebhookSubscription(subscriptionId, input, context);
  }

  ensurePermission(context, "manage_users");
  const parsed = webhookSubscriptionUpdateSchema.parse(input);
  const prisma = getPrisma() as any;
  const existing = await prisma.extensionWebhookSubscription.findFirst({
    where: { id: subscriptionId, organizationId: context.organization.id },
  });

  if (!existing) {
    throw new Error("Webhook subscription not found.");
  }

  const updated = await prisma.extensionWebhookSubscription.update({
    where: { id: existing.id },
    data: {
      url: parsed.url,
      events: parsed.events,
      secret:
        parsed.secret === undefined ? undefined : parsed.secret || null,
      status: parsed.status,
    },
  });
  return mapWebhookSubscription(updated);
}

export async function upsertCustomField(
  entityType: string,
  entityId: string,
  input: unknown,
  context: AuthContext,
) {
  if (!dbMode()) {
    return upsertDemoCustomField(entityType, entityId, input, context);
  }

  ensurePermission(context, "manage_products");
  const parsed = customFieldInputSchema.parse(input);
  const field = await (getPrisma() as any).customField.upsert({
    where: {
      organizationId_entityType_entityId_key: {
        organizationId: context.organization.id,
        entityType,
        entityId,
        key: parsed.key,
      },
    },
    update: { value: parsed.value },
    create: {
      organizationId: context.organization.id,
      entityType,
      entityId,
      key: parsed.key,
      value: parsed.value,
    },
  });
  return mapCustomField(field);
}

async function fetchText(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

export async function createProduct(input: unknown, context: AuthContext) {
  if (!dbMode()) {
    return createDemoProduct(input, context);
  }

  ensurePermission(context, "manage_products");
  const parsed = productInputSchema.parse(input);

  const product = await getPrisma()
    .product.create({
      data: {
        organizationId: context.organization.id,
        sku: parsed.sku,
        name: parsed.name,
        barcode: parsed.barcode || null,
        category: parsed.category,
        minimumStock: parsed.minimumStock,
      },
    })
    .catch((error: unknown) => {
      if (isUniqueConstraintError(error)) {
        throw new Error("Bu SKU zaten kayitli.");
      }

      throw error;
    });

  await audit(
    context,
    "CREATE",
    "Product",
    product.id,
    `${parsed.sku} ürünü oluşturuldu`,
  );

  globalPluginManager.dispatch("product.updated", product).catch(console.error);
}

export async function updateProduct(
  productId: string,
  input: unknown,
  context: AuthContext,
) {
  if (!dbMode()) {
    return updateDemoProduct(productId, input, context);
  }

  ensureRecordId(productId, "Urun");
  ensurePermission(context, "manage_products");
  const parsed = productUpdateInputSchema.parse(input);
  const product = await getPrisma().product.findFirst({
    where: { id: productId, organizationId: context.organization.id },
  });

  if (!product) {
    throw new Error("Urun bulunamadi.");
  }

  const updated = await getPrisma()
    .product.update({
      where: { id: product.id },
      data: {
        sku: parsed.sku,
        name: parsed.name,
        barcode:
          parsed.barcode === undefined ? undefined : parsed.barcode || null,
        category: parsed.category,
        minimumStock: parsed.minimumStock,
      },
    })
    .catch((error: unknown) => {
      if (isUniqueConstraintError(error)) {
        throw new Error("Bu SKU zaten kayitli.");
      }

      throw error;
    });

  await audit(
    context,
    "UPDATE",
    "Product",
    updated.id,
    `${updated.sku} urunu guncellendi`,
  );
}

export async function setProductActive(
  productId: string,
  isActive: boolean,
  context: AuthContext,
) {
  if (!dbMode()) {
    return setDemoProductActive(productId, isActive, context);
  }

  ensureRecordId(productId, "Urun");
  ensurePermission(context, "manage_products");
  const product = await getPrisma().product.findFirst({
    where: { id: productId, organizationId: context.organization.id },
  });

  if (!product) {
    throw new Error("Urun bulunamadi.");
  }

  const updated = await getPrisma().product.update({
    where: { id: product.id },
    data: { isActive },
  });

  await audit(
    context,
    "UPDATE",
    "Product",
    updated.id,
    `${updated.sku} urunu ${isActive ? "aktif" : "pasif"} yapildi`,
  );
}

export async function createStockMovement(input: unknown, context: AuthContext) {
  if (!dbMode()) {
    return createDemoStockMovement(input, context);
  }

  ensurePermission(context, "manage_stock");
  const parsed = stockMovementInputSchema.parse(input);
  const quantityChange =
    parsed.type === "OUTBOUND" ? -parsed.quantity : parsed.quantity;

  if (quantityChange < 0) {
    const movements = await getPrisma().stockMovement.findMany({
      where: {
        organizationId: context.organization.id,
        productId: parsed.productId,
        warehouseId: parsed.warehouseId,
      },
    });

    assertEnoughStock(
      movements.map(mapStockMovement),
      parsed.warehouseId,
      [{ productId: parsed.productId, quantity: parsed.quantity }],
    );
  }

  const movement = await getPrisma().stockMovement.create({
    data: {
      organizationId: context.organization.id,
      productId: parsed.productId,
      warehouseId: parsed.warehouseId,
      type: parsed.type,
      quantityChange,
      note: parsed.note || null,
      createdById: context.user.id,
    },
  });

  await audit(
    context,
    "CREATE",
    "StockMovement",
    movement.id,
    `${parsed.type} hareketi kaydedildi`,
  );

  globalPluginManager.dispatch("stock.changed", { productId: parsed.productId, quantityChange }).catch(console.error);
}

export async function createStockTransfer(input: unknown, context: AuthContext) {
  if (!dbMode()) {
    return createDemoStockTransfer(input, context);
  }

  ensurePermission(context, "manage_stock");
  const parsed = stockTransferInputSchema.parse(input);
  const prisma = getPrisma();

  const [product, sourceWarehouse, destinationWarehouse] = await Promise.all([
    prisma.product.findFirst({
      where: {
        id: parsed.productId,
        isActive: true,
        organizationId: context.organization.id,
      },
    }),
    prisma.warehouse.findFirst({
      where: {
        id: parsed.sourceWarehouseId,
        organizationId: context.organization.id,
      },
    }),
    prisma.warehouse.findFirst({
      where: {
        id: parsed.destinationWarehouseId,
        organizationId: context.organization.id,
      },
    }),
  ]);

  if (!product || !sourceWarehouse || !destinationWarehouse) {
    throw new Error("Urun veya depo bulunamadi.");
  }

  const sourceMovements = await prisma.stockMovement.findMany({
    where: {
      organizationId: context.organization.id,
      productId: parsed.productId,
      warehouseId: parsed.sourceWarehouseId,
    },
  });

  assertEnoughStock(
    sourceMovements.map(mapStockMovement),
    parsed.sourceWarehouseId,
    [{ productId: parsed.productId, quantity: parsed.quantity }],
  );

  const transferMovementCount = await prisma.stockMovement.count({
    where: { organizationId: context.organization.id, type: "TRANSFER" },
  });
  const reference = nextCode("TR", Math.floor(transferMovementCount / 2));

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.createMany({
      data: [
        {
          organizationId: context.organization.id,
          warehouseId: parsed.sourceWarehouseId,
          productId: parsed.productId,
          type: "TRANSFER",
          quantityChange: -parsed.quantity,
          reference,
          note: parsed.note || `Transfer to ${destinationWarehouse.name}`,
          createdById: context.user.id,
        },
        {
          organizationId: context.organization.id,
          warehouseId: parsed.destinationWarehouseId,
          productId: parsed.productId,
          type: "TRANSFER",
          quantityChange: parsed.quantity,
          reference,
          note: parsed.note || `Transfer from ${sourceWarehouse.name}`,
          createdById: context.user.id,
        },
      ],
    });
    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "CREATE",
        entityType: "StockTransfer",
        entityId: reference,
        summary: `${reference} stok transferi olusturuldu`,
      },
    });
  });

  const movements = await prisma.stockMovement.findMany({
    where: { organizationId: context.organization.id, reference },
    orderBy: { quantityChange: "asc" },
  });

  return { movements: movements.map(mapStockMovement), reference };
}

export async function createWarehouse(input: unknown, context: AuthContext) {
  if (!dbMode()) {
    return createDemoWarehouse(input, context);
  }

  ensurePermission(context, "manage_stock");
  const parsed = warehouseInputSchema.parse(input);
  const prisma = getPrisma();

  try {
    return await prisma.$transaction(async (tx) => {
      const warehouseCount = await tx.warehouse.count({
        where: { organizationId: context.organization.id },
      });
      const isDefault = parsed.isDefault === true || warehouseCount === 0;

      if (isDefault) {
        await tx.warehouse.updateMany({
          where: { organizationId: context.organization.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      const warehouse = await tx.warehouse.create({
        data: {
          organizationId: context.organization.id,
          code: parsed.code,
          name: parsed.name,
          isDefault,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          actorId: context.user.id,
          action: "CREATE",
          entityType: "Warehouse",
          entityId: warehouse.id,
          summary: `${warehouse.code} deposu olusturuldu`,
        },
      });

      return mapWarehouse(warehouse);
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error("Bu depo kodu zaten kayitli.");
    }

    throw error;
  }
}

export async function updateWarehouse(
  warehouseId: string,
  input: unknown,
  context: AuthContext,
) {
  if (!dbMode()) {
    return updateDemoWarehouse(warehouseId, input, context);
  }

  ensureRecordId(warehouseId, "Depo");
  ensurePermission(context, "manage_stock");
  const parsed = warehouseUpdateInputSchema.parse(input);
  const prisma = getPrisma();

  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, organizationId: context.organization.id },
  });

  if (!warehouse) {
    throw new Error("Depo bulunamadi.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (parsed.isDefault === true) {
        await tx.warehouse.updateMany({
          where: { organizationId: context.organization.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      const updated = await tx.warehouse.update({
        where: { id: warehouse.id },
        data: {
          code: parsed.code,
          name: parsed.name,
          isDefault: parsed.isDefault === true ? true : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          actorId: context.user.id,
          action: "UPDATE",
          entityType: "Warehouse",
          entityId: updated.id,
          summary: `${updated.code} deposu guncellendi`,
        },
      });

      return mapWarehouse(updated);
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error("Bu depo kodu zaten kayitli.");
    }

    throw error;
  }
}

export async function createSupplier(input: unknown, context: AuthContext) {
  if (!dbMode()) {
    return createDemoSupplier(input, context);
  }

  ensurePermission(context, "manage_purchasing");
  const parsed = supplierInputSchema.parse(input);
  const supplier = await getPrisma()
    .supplier.create({
      data: {
        organizationId: context.organization.id,
        name: parsed.name,
        contactName: parsed.contactName || null,
        email: parsed.email || null,
        phone: parsed.phone || null,
        leadTimeDays: parsed.leadTimeDays,
      },
    })
    .catch((error: unknown) => {
      if (isUniqueConstraintError(error)) {
        throw new Error("Bu tedarikci zaten kayitli.");
      }

      throw error;
    });

  await audit(
    context,
    "CREATE",
    "Supplier",
    supplier.id,
    `${supplier.name} tedarikçisi oluşturuldu`,
  );
}

export async function updateSupplier(
  supplierId: string,
  input: unknown,
  context: AuthContext,
) {
  if (!dbMode()) {
    return updateDemoSupplier(supplierId, input, context);
  }

  ensureRecordId(supplierId, "Tedarikci");
  ensurePermission(context, "manage_purchasing");
  const parsed = supplierUpdateInputSchema.parse(input);
  const supplier = await getPrisma().supplier.findFirst({
    where: { id: supplierId, organizationId: context.organization.id },
  });

  if (!supplier) {
    throw new Error("Tedarikci bulunamadi.");
  }

  const updated = await getPrisma()
    .supplier.update({
      where: { id: supplier.id },
      data: {
        name: parsed.name,
        contactName:
          parsed.contactName === undefined ? undefined : parsed.contactName || null,
        email: parsed.email === undefined ? undefined : parsed.email || null,
        phone: parsed.phone === undefined ? undefined : parsed.phone || null,
        leadTimeDays: parsed.leadTimeDays,
      },
    })
    .catch((error: unknown) => {
      if (isUniqueConstraintError(error)) {
        throw new Error("Bu tedarikci zaten kayitli.");
      }

      throw error;
    });

  await audit(
    context,
    "UPDATE",
    "Supplier",
    updated.id,
    `${updated.name} tedarikcisi guncellendi`,
  );
}

export async function createSalesOrder(input: unknown, context: AuthContext) {
  if (!dbMode()) {
    return createDemoSalesOrder(input, context);
  }

  ensurePermission(context, "manage_sales");
  const parsed = salesOrderInputSchema.parse(input);
  const prisma = getPrisma();
  const count = await prisma.salesOrder.count({
    where: { organizationId: context.organization.id },
  });
  const order = await prisma.salesOrder.create({
    data: {
      organizationId: context.organization.id,
      code: nextCode("SO", count),
      customerName: parsed.customerName,
      lines: {
        create: [{ productId: parsed.productId, quantity: parsed.quantity }],
      },
    },
  });

  await audit(
    context,
    "CREATE",
    "SalesOrder",
    order.id,
    `${order.code} satış siparişi oluşturuldu`,
  );

  globalPluginManager.dispatch("order.created", order).catch(console.error);
}

export async function confirmSalesOrder(orderId: string, context: AuthContext) {
  if (!dbMode()) {
    return confirmDemoSalesOrder(orderId, context);
  }

  ensurePermission(context, "manage_sales");
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findFirst({
      where: {
        id: orderId,
        organizationId: context.organization.id,
        status: "DRAFT",
      },
      include: { lines: true },
    });
    const warehouse = await tx.warehouse.findFirst({
      where: { organizationId: context.organization.id, isDefault: true },
    });

    if (!order || !warehouse) {
      throw new Error("Sipariş veya depo bulunamadı.");
    }

    const movements = await tx.stockMovement.findMany({
      where: {
        organizationId: context.organization.id,
        warehouseId: warehouse.id,
        productId: { in: order.lines.map((line) => line.productId) },
      },
    });

    assertEnoughStock(
      movements.map(mapStockMovement),
      warehouse.id,
      order.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      })),
    );

    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: "CONFIRMED" },
    });
    await tx.stockMovement.createMany({
      data: order.lines.map((line) => ({
        organizationId: context.organization.id,
        warehouseId: warehouse.id,
        productId: line.productId,
        type: "SALE",
        quantityChange: -line.quantity,
        reference: order.code,
        note: "Satış siparişi onayı",
        createdById: context.user.id,
      })),
    });
    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "CONFIRM",
        entityType: "SalesOrder",
        entityId: order.id,
        summary: `${order.code} onaylandı ve stok düşüldü`,
      },
    });
  });
}

export async function createPurchaseOrder(input: unknown, context: AuthContext) {
  if (!dbMode()) {
    return createDemoPurchaseOrder(input, context);
  }

  ensurePermission(context, "manage_purchasing");
  const parsed = purchaseOrderInputSchema.parse(input);
  const prisma = getPrisma();
  const count = await prisma.purchaseOrder.count({
    where: { organizationId: context.organization.id },
  });
  const order = await prisma.purchaseOrder.create({
    data: {
      organizationId: context.organization.id,
      code: nextCode("PO", count),
      supplierId: parsed.supplierId,
      status: "SENT",
      expectedDate: parsed.expectedDate ? new Date(parsed.expectedDate) : null,
      lines: {
        create: [{ productId: parsed.productId, quantity: parsed.quantity }],
      },
    },
  });

  await audit(
    context,
    "CREATE",
    "PurchaseOrder",
    order.id,
    `${order.code} satın alma siparişi oluşturuldu`,
  );
}

export async function receivePurchaseOrder(
  orderId: string,
  context: AuthContext,
) {
  if (!dbMode()) {
    return receiveDemoPurchaseOrder(orderId, context);
  }

  ensurePermission(context, "manage_purchasing");
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findFirst({
      where: {
        id: orderId,
        organizationId: context.organization.id,
        status: { in: ["DRAFT", "SENT", "PARTIALLY_RECEIVED"] },
      },
      include: { lines: true },
    });
    const warehouse = await tx.warehouse.findFirst({
      where: { organizationId: context.organization.id, isDefault: true },
    });

    if (!order || !warehouse) {
      throw new Error("Sipariş veya depo bulunamadı.");
    }

    const receipts: PurchaseOrderLine[] = order.lines
      .map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        receivedQuantity: line.receivedQuantity,
      }))
      .filter((line) => line.quantity > line.receivedQuantity);

    if (receipts.length === 0) {
      return;
    }

    await Promise.all(
      order.lines.map((line) =>
        tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: { receivedQuantity: line.quantity },
        }),
      ),
    );
    await tx.stockMovement.createMany({
      data: receipts.map((line) => ({
        organizationId: context.organization.id,
        warehouseId: warehouse.id,
        productId: line.productId,
        type: "PURCHASE_RECEIPT",
        quantityChange: line.quantity - line.receivedQuantity,
        reference: order.code,
        note: "Satın alma teslimi",
        createdById: context.user.id,
      })),
    });
    await tx.purchaseOrder.update({
      where: { id: order.id },
      data: { status: "COMPLETED" },
    });
    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "RECEIVE",
        entityType: "PurchaseOrder",
        entityId: order.id,
        summary: `${order.code} teslim alındı`,
      },
    });
  });
}

export async function createVariant(input: unknown, context: AuthContext) {
  ensurePermission(context, "manage_products");
  const parsed = variantInputSchema.parse(input);
  const prisma = getPrisma();

  const product = await prisma.product.findFirst({
    where: { id: parsed.productId, organizationId: context.organization.id },
  });

  if (!product) {
    throw new Error("Ürün bulunamadı.");
  }

  let attributes: Record<string, string> = {};
  if (parsed.attributes) {
    try {
      attributes = JSON.parse(parsed.attributes);
    } catch {
      throw new Error("Geçersiz özellik formatı. JSON formatında giriniz.");
    }
  }

  const variant = await prisma.productVariant
    .create({
      data: {
        productId: product.id,
        sku: parsed.sku,
        name: parsed.name,
        barcode: parsed.barcode || null,
        unitPrice: parsed.unitPrice ?? 0,
        costPrice: parsed.costPrice ?? null,
        weight: parsed.weight ?? null,
        attributes,
      },
    })
    .catch((error: unknown) => {
      if (isUniqueConstraintError(error)) {
        throw new Error("Bu varyant SKU zaten kayıtlı.");
      }
      throw error;
    });

  await audit(
    context,
    "CREATE",
    "ProductVariant",
    variant.id,
    `${variant.sku} varyantı oluşturuldu (${product.sku})`,
  );
}

export async function updateVariant(
  variantId: string,
  input: unknown,
  context: AuthContext,
) {
  ensureRecordId(variantId, "Varyant");
  ensurePermission(context, "manage_products");
  const parsed = variantUpdateInputSchema.parse(input);
  const prisma = getPrisma();

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant || variant.product.organizationId !== context.organization.id) {
    throw new Error("Varyant bulunamadı.");
  }

  let attributes: Record<string, string> | undefined;
  if (parsed.attributes !== undefined) {
    try {
      attributes = parsed.attributes ? JSON.parse(parsed.attributes) : {};
    } catch {
      throw new Error("Geçersiz özellik formatı.");
    }
  }

  const updated = await prisma.productVariant
    .update({
      where: { id: variant.id },
      data: {
        sku: parsed.sku,
        name: parsed.name,
        barcode: parsed.barcode === undefined ? undefined : parsed.barcode || null,
        unitPrice: parsed.unitPrice,
        costPrice: parsed.costPrice === undefined ? undefined : parsed.costPrice ?? null,
        weight: parsed.weight === undefined ? undefined : parsed.weight ?? null,
        attributes: attributes ?? undefined,
      },
    })
    .catch((error: unknown) => {
      if (isUniqueConstraintError(error)) {
        throw new Error("Bu varyant SKU zaten kayıtlı.");
      }
      throw error;
    });

  await audit(
    context,
    "UPDATE",
    "ProductVariant",
    updated.id,
    `${updated.sku} varyantı güncellendi`,
  );
}

export async function deleteVariant(variantId: string, context: AuthContext) {
  ensureRecordId(variantId, "Varyant");
  ensurePermission(context, "manage_products");
  const prisma = getPrisma();

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant || variant.product.organizationId !== context.organization.id) {
    throw new Error("Varyant bulunamadı.");
  }

  await prisma.productVariant.delete({ where: { id: variant.id } });

  await audit(
    context,
    "UPDATE",
    "ProductVariant",
    variant.id,
    `${variant.sku} varyantı silindi`,
  );
}

export async function getProductVariants(
  productId: string,
  context: AuthContext,
): Promise<ProductVariant[]> {
  const prisma = getPrisma();

  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId: context.organization.id },
  });

  if (!product) {
    throw new Error("Ürün bulunamadı.");
  }

  const variants = await prisma.productVariant.findMany({
    where: { productId: product.id },
    orderBy: { createdAt: "asc" },
  });

  return variants.map((v) => ({
    id: v.id,
    productId: v.productId,
    sku: v.sku,
    name: v.name,
    barcode: v.barcode ?? undefined,
    unitPrice: Number(v.unitPrice),
    costPrice: v.costPrice ? Number(v.costPrice) : undefined,
    weight: v.weight ? Number(v.weight) : undefined,
    isActive: v.isActive,
    attributes: (v.attributes as Record<string, string>) ?? {},
  }));
}

export async function createSalesReturn(input: unknown, context: AuthContext) {
  ensurePermission(context, "manage_sales");
  const parsed = salesReturnInputSchema.parse(input);
  const prisma = getPrisma();

  const order = await prisma.salesOrder.findFirst({
    where: {
      id: parsed.salesOrderId,
      organizationId: context.organization.id,
      status: "CONFIRMED",
    },
    include: { lines: true },
  });

  if (!order) {
    throw new Error("Onaylanmış sipariş bulunamadı.");
  }

  for (const line of parsed.lines) {
    const orderLine = order.lines.find((ol) => ol.productId === line.productId);
    if (!orderLine) {
      throw new Error(`Ürün ${line.productId} bu siparişte bulunmuyor.`);
    }
    if (line.quantity > orderLine.quantity) {
      throw new Error(
        `İade miktarı sipariş miktarını aşamaz (${orderLine.quantity}).`,
      );
    }
  }

  const returnCount = await prisma.salesReturn.count({
    where: { organizationId: context.organization.id },
  });
  const returnCode = nextCode("RET", returnCount);

  const salesReturn = await prisma.$transaction(async (tx) => {
    const created = await tx.salesReturn.create({
      data: {
        organizationId: context.organization.id,
        salesOrderId: order.id,
        code: returnCode,
        reason: parsed.reason || null,
        status: "DRAFT",
        lines: {
          create: parsed.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        },
      },
      include: { lines: true },
    });

    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "CREATE",
        entityType: "SalesReturn",
        entityId: created.id,
        summary: `${returnCode} iade talebi oluşturuldu (sipariş: ${order.code})`,
      },
    });

    return created;
  });

  return salesReturn;
}

export async function approveSalesReturn(returnId: string, context: AuthContext) {
  ensurePermission(context, "manage_sales");
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    const salesReturn = await tx.salesReturn.findFirst({
      where: {
        id: returnId,
        organizationId: context.organization.id,
        status: "DRAFT",
      },
      include: { lines: true, salesOrder: true },
    });

    if (!salesReturn) {
      throw new Error("İade talebi bulunamadı veya onaylanamaz.");
    }

    const warehouse = await tx.warehouse.findFirst({
      where: { organizationId: context.organization.id, isDefault: true },
    });

    if (!warehouse) {
      throw new Error("Varsayılan depo bulunamadı.");
    }

    // Create stock reversal movements
    await tx.stockMovement.createMany({
      data: salesReturn.lines.map((line) => ({
        organizationId: context.organization.id,
        warehouseId: warehouse.id,
        productId: line.productId,
        type: "INBOUND" as const,
        quantityChange: line.quantity,
        reference: salesReturn.code,
        note: `İade: ${salesReturn.salesOrder.code}`,
        createdById: context.user.id,
      })),
    });

    // Mark lines as restocked
    await Promise.all(
      salesReturn.lines.map((line) =>
        tx.salesReturnLine.update({
          where: { id: line.id },
          data: { restocked: true },
        }),
      ),
    );

    await tx.salesReturn.update({
      where: { id: salesReturn.id },
      data: { status: "COMPLETED" },
    });

    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "CONFIRM",
        entityType: "SalesReturn",
        entityId: salesReturn.id,
        summary: `${salesReturn.code} iade onaylandı, stok iade edildi`,
      },
    });
  });
}

export async function createUser(input: unknown, context: AuthContext) {
  if (!dbMode()) {
    return createDemoUser(input, context);
  }

  ensurePermission(context, "manage_users");
  const parsed = userInputSchema.parse(input);
  const prisma = getPrisma();

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.email },
  });

  if (existingUser) {
    const existingMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: context.organization.id,
          userId: existingUser.id,
        },
      },
    });

    if (existingMembership) {
      throw new Error("Bu e-posta adresi zaten kayıtlı.");
    }
  }

  const passwordHash = hashPassword(parsed.password);

  await prisma.$transaction(async (tx) => {
    const user = existingUser ??
      await tx.user.create({
        data: {
          name: parsed.name,
          email: parsed.email,
          passwordHash,
        },
      });

    if (!existingUser) {
      // user was just created above
    } else {
      await tx.user.update({
        where: { id: user.id },
        data: { name: parsed.name, passwordHash },
      });
    }

    await tx.membership.create({
      data: {
        organizationId: context.organization.id,
        userId: user.id,
         
        role: parsed.role as any,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "CREATE",
        entityType: "User",
        entityId: user.id,
        summary: `${parsed.name} kullanıcısı ${parsed.role} rolüyle eklendi`,
      },
    });
  });
}

export async function updateUserRole(
  membershipId: string,
  input: unknown,
  context: AuthContext,
) {
  if (!dbMode()) {
    return updateDemoUserRole(membershipId, input, context);
  }

  ensureRecordId(membershipId, "Üyelik");
  ensurePermission(context, "manage_users");
  const parsed = userUpdateRoleSchema.parse(input);
  const prisma = getPrisma();

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: context.organization.id },
    include: { user: true },
  });

  if (!membership) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  if (membership.userId === context.user.id) {
    throw new Error("Kendi rolünüzü değiştiremezsiniz.");
  }

  await prisma.membership.update({
    where: { id: membership.id },
     
    data: { role: parsed.role as any },
  });

  await audit(
    context,
    "UPDATE",
    "User",
    membership.userId,
    `${membership.user.name} kullanıcısının rolü ${parsed.role} olarak güncellendi`,
  );
}

export async function deleteUser(membershipId: string, context: AuthContext) {
  if (!dbMode()) {
    return deleteDemoUser(membershipId, context);
  }

  ensureRecordId(membershipId, "Üyelik");
  ensurePermission(context, "manage_users");
  const prisma = getPrisma();

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: context.organization.id },
    include: { user: true },
  });

  if (!membership) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  if (membership.userId === context.user.id) {
    throw new Error("Kendinizi silemezsiniz.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({
      where: {
        userId: membership.userId,
        organizationId: context.organization.id,
      },
    });

    await tx.membership.delete({ where: { id: membership.id } });

    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "UPDATE",
        entityType: "User",
        entityId: membership.userId,
        summary: `${membership.user.name} kullanıcısı organizasyondan çıkarıldı`,
      },
    });
  });
}

// ── BOM + Manufacturing ──

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function createBom(input: unknown, context: AuthContext) {
  if (!dbMode()) {
    return createDemoBom(input, context);
  }

  ensurePermission(context, "manage_products");
  const parsed = bomInputSchema.parse(input);
  const prisma = getPrisma() as any;

  const product = await prisma.product.findFirst({
    where: { id: parsed.productId, organizationId: context.organization.id },
  });
  if (!product) throw new Error("Ürün bulunamadı.");

  const bom = await prisma.billOfMaterial.create({
    data: {
      organizationId: context.organization.id,
      productId: parsed.productId,
      name: parsed.name,
      description: parsed.description || null,
      components: {
        create: parsed.components.map((c: any, i: number) => ({
          componentProductId: c.componentProductId,
          quantity: c.quantity,
          sortOrder: c.sortOrder ?? i,
        })),
      },
    },
  }).catch((error: unknown) => {
    if (isUniqueConstraintError(error)) {
      throw new Error("Bu ürün için zaten bir reçete mevcut.");
    }
    throw error;
  });

  await audit(context, "CREATE", "BillOfMaterial", bom.id, `${parsed.name} reçetesi oluşturuldu (${product.sku})`);
}

export async function updateBom(bomId: string, input: unknown, context: AuthContext) {
  if (!dbMode()) {
    return updateDemoBom(bomId, input, context);
  }

  ensurePermission(context, "manage_products");
  const parsed = bomUpdateInputSchema.parse(input);
  const prisma = getPrisma() as any;

  const bom = await prisma.billOfMaterial.findFirst({
    where: { id: bomId, organizationId: context.organization.id },
  });
  if (!bom) throw new Error("Reçete bulunamadı.");

  await prisma.$transaction(async (tx: any) => {
    if (parsed.components) {
      await tx.bomComponent.deleteMany({ where: { bomId: bom.id } });
      await tx.bomComponent.createMany({
        data: parsed.components.map((c: any, i: number) => ({
          bomId: bom.id,
          componentProductId: c.componentProductId,
          quantity: c.quantity,
          sortOrder: c.sortOrder ?? i,
        })),
      });
    }

    await tx.billOfMaterial.update({
      where: { id: bom.id },
      data: {
        name: parsed.name,
        description: parsed.description !== undefined ? (parsed.description || null) : undefined,
      },
    });
  });

  await audit(context, "UPDATE", "BillOfMaterial", bom.id, `${parsed.name ?? bom.name} reçetesi güncellendi`);
}

export async function createManufacturingOrder(input: unknown, context: AuthContext) {
  if (!dbMode()) {
    return createDemoMo(input, context);
  }

  ensurePermission(context, "manage_stock");
  const parsed = manufacturingOrderInputSchema.parse(input);
  const prisma = getPrisma() as any;

  const bom = await prisma.billOfMaterial.findFirst({
    where: { id: parsed.bomId, organizationId: context.organization.id },
  });
  if (!bom) throw new Error("Reçete bulunamadı.");

  const count = await prisma.manufacturingOrder.count({
    where: { organizationId: context.organization.id },
  });

  const mo = await prisma.manufacturingOrder.create({
    data: {
      organizationId: context.organization.id,
      bomId: parsed.bomId,
      warehouseId: parsed.warehouseId,
      code: nextCode("MO", count),
      quantity: parsed.quantity,
    },
  });

  await audit(context, "CREATE", "ManufacturingOrder", mo.id, `${mo.code} üretim emri oluşturuldu`);
}

export async function startManufacturingOrder(moId: string, context: AuthContext) {
  if (!dbMode()) {
    return startDemoMo(moId, context);
  }

  ensurePermission(context, "manage_stock");
  const prisma = getPrisma() as any;

  await prisma.$transaction(async (tx: any) => {
    const mo = await tx.manufacturingOrder.findFirst({
      where: { id: moId, organizationId: context.organization.id, status: "DRAFT" },
    });
    if (!mo) throw new Error("Üretim emri bulunamadı veya başlatılamaz.");

    const bom = await tx.billOfMaterial.findFirst({
      where: { id: mo.bomId },
      include: { components: true },
    });
    if (!bom) throw new Error("Reçete bulunamadı.");

    for (const comp of bom.components) {
      const consumeQty = Number(comp.quantity) * mo.quantity;
      const movements = await tx.stockMovement.findMany({
        where: {
          organizationId: context.organization.id,
          warehouseId: mo.warehouseId,
          productId: comp.componentProductId,
        },
      });
      const onHand = movements.reduce((sum: number, m: any) => sum + m.quantityChange, 0);
      if (onHand < consumeQty) {
        throw new Error(`Yetersiz hammadde stoku (bileşen: ${comp.componentProductId}).`);
      }

      await tx.stockMovement.create({
        data: {
          organizationId: context.organization.id,
          warehouseId: mo.warehouseId,
          productId: comp.componentProductId,
          type: "MANUFACTURE_CONSUME",
          quantityChange: -consumeQty,
          reference: mo.code,
          note: "Üretim hammadde tüketimi",
          createdById: context.user.id,
        },
      });
    }

    await tx.manufacturingOrder.update({
      where: { id: mo.id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "UPDATE",
        entityType: "ManufacturingOrder",
        entityId: mo.id,
        summary: `${mo.code} üretim başlatıldı`,
      },
    });
  });
}

export async function completeManufacturingOrder(moId: string, context: AuthContext) {
  if (!dbMode()) {
    return completeDemoMo(moId, context);
  }

  ensurePermission(context, "manage_stock");
  const prisma = getPrisma() as any;

  await prisma.$transaction(async (tx: any) => {
    const mo = await tx.manufacturingOrder.findFirst({
      where: { id: moId, organizationId: context.organization.id, status: "IN_PROGRESS" },
    });
    if (!mo) throw new Error("Üretim emri bulunamadı veya tamamlanamaz.");

    const bom = await tx.billOfMaterial.findFirst({
      where: { id: mo.bomId },
    });
    if (!bom) throw new Error("Reçete bulunamadı.");

    await tx.stockMovement.create({
      data: {
        organizationId: context.organization.id,
        warehouseId: mo.warehouseId,
        productId: bom.productId,
        type: "MANUFACTURE_PRODUCE",
        quantityChange: mo.quantity,
        reference: mo.code,
        note: "Üretim çıktısı",
        createdById: context.user.id,
      },
    });

    await tx.manufacturingOrder.update({
      where: { id: mo.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "UPDATE",
        entityType: "ManufacturingOrder",
        entityId: mo.id,
        summary: `${mo.code} üretim tamamlandı`,
      },
    });
  });
}

function nextCode(prefix: string, count: number) {
  return `${prefix}-${String(count + 1001).padStart(4, "0")}`;
}

async function audit(
  context: AuthContext,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
) {
  await getPrisma().auditLog.create({
    data: {
      organizationId: context.organization.id,
      actorId: context.user.id,
      action: action as any,
      entityType,
      entityId,
      summary,
    },
  });
}

export async function getSalesOrderDetails(orderId: string, context: AuthContext) {
  if (!dbMode()) {
    const { getDemoSnapshot } = await import("@/lib/demo-store");
    const snapshot = getDemoSnapshot(context);
    const order = snapshot.salesOrders.find(o => o.id === orderId);
    if (!order) throw new Error("Sipariş bulunamadı.");
    const mockOrder = {
      ...order,
      lines: order.lines.map(l => ({ ...l, id: l.productId, product: snapshot.products.find(p => p.id === l.productId)! })),
      pickListItems: [],
      shipments: []
     
    } as any;
    return { order: mockOrder, pickLists: [] };
  }
  const prisma = getPrisma();
  const order = await (prisma.salesOrder as any).findFirst({
    where: { id: orderId, organizationId: context.organization.id },
    include: {
      lines: { include: { product: true } },
      pickListItems: { include: { product: true } },
      shipments: true,
    },
  });
  if (!order) {
    throw new Error("Sipariş bulunamadı.");
  }
  const pickLists = await (prisma as any).pickList.findMany({
    where: { organizationId: context.organization.id, id: { in: order.pickListItems.map((i: any) => i.pickListId) } },
    include: { items: { include: { product: true } } },
  });
  return { order, pickLists };
}

export async function startPicking(orderId: string, context: AuthContext) {
  if (!dbMode()) return;
  ensurePermission(context, "manage_stock");
  const prisma = getPrisma();

  await prisma.$transaction(async (tx: any) => {
    const order = await tx.salesOrder.findFirst({
      where: { id: orderId, organizationId: context.organization.id, status: "CONFIRMED" },
      include: { lines: true },
    });
    const warehouse = await tx.warehouse.findFirst({
      where: { organizationId: context.organization.id, isDefault: true },
    });

    if (!order || !warehouse) {
      throw new Error("Sipariş veya depo bulunamadı (Siparişin durumu ONAYLANDI olmalıdır).");
    }

    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: "PICKING" },
    });

    await tx.pickList.create({
      data: {
        organizationId: context.organization.id,
        warehouseId: warehouse.id,
        status: "PENDING",
        priority: 1,
        items: {
          create: order.lines.map((line: any) => ({
            salesOrderId: order.id,
            productId: line.productId,
            quantity: line.quantity,
            pickedQty: 0,
          })),
        },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "PICK",
        entityType: "SalesOrder",
        entityId: order.id,
        summary: `${order.code} için toplama başlatıldı`,
      },
    });
  });
}

export async function updatePickListItem(
  pickListId: string,
  itemId: string,
  pickedQty: number,
  context: AuthContext,
) {
  if (!dbMode()) return;
  ensurePermission(context, "manage_stock");
  const prisma = getPrisma();

  await prisma.$transaction(async (tx: any) => {
    const pickList = await tx.pickList.findFirst({
      where: { id: pickListId, organizationId: context.organization.id },
    });
    const item = await tx.pickListItem.findFirst({
      where: { id: itemId, pickListId },
    });

    if (!pickList || !item) {
      throw new Error("Toplama listesi veya kalemi bulunamadı.");
    }
    if (pickedQty < 0 || pickedQty > item.quantity) {
      throw new Error("Geçersiz miktar.");
    }

    if (pickList.status === "PENDING") {
      await tx.pickList.update({
        where: { id: pickListId },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
      });
    }

    await tx.pickListItem.update({
      where: { id: itemId },
      data: { pickedQty },
    });
  });
}

export async function packOrder(orderId: string, context: AuthContext) {
  if (!dbMode()) return;
  ensurePermission(context, "manage_stock");
  const prisma = getPrisma();

  await prisma.$transaction(async (tx: any) => {
    const order = await tx.salesOrder.findFirst({
      where: { id: orderId, organizationId: context.organization.id, status: "PICKING" },
      include: { pickListItems: true },
    });

    if (!order) {
      throw new Error("Sipariş bulunamadı veya durumu uygun değil.");
    }

    const allPicked = order.pickListItems.every((item: any) => item.pickedQty >= item.quantity);
    if (!allPicked) {
      throw new Error("Tüm ürünler tam olarak toplanmadan paketleme yapılamaz.");
    }

    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: "PACKED" },
    });

    const pickListIds = [...new Set(order.pickListItems.map((i: any) => i.pickListId))];
    for (const plId of pickListIds) {
      await tx.pickList.update({
        where: { id: plId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "PACK",
        entityType: "SalesOrder",
        entityId: order.id,
        summary: `${order.code} paketlendi`,
      },
    });
  });
}

export async function shipOrder(
  orderId: string,
  input: { carrier?: string; trackingNumber?: string; weight?: number; packageCount?: number },
  context: AuthContext,
) {
  if (!dbMode()) return;
  ensurePermission(context, "manage_stock");
  const prisma = getPrisma();

  await prisma.$transaction(async (tx: any) => {
    const order = await tx.salesOrder.findFirst({
      where: { id: orderId, organizationId: context.organization.id, status: "PACKED" },
    });

    if (!order) {
      throw new Error("Sipariş bulunamadı veya durumu uygun değil.");
    }

    const count = await tx.shipment.count({
      where: { organizationId: context.organization.id },
    });
    const shipmentCode = nextCode("SHP", count);

    let trackingUrl = null;
    if (input.trackingNumber) {
      const carrier = input.carrier?.toLowerCase() || "";
      if (carrier === "yurtiçi" || carrier === "yurtici") {
        trackingUrl = `https://www.yurticikargo.com/tr/online-islemler/gonderi-sorgula?code=${input.trackingNumber}`;
      } else if (carrier === "aras") {
        trackingUrl = `https://kargotakip.araskargo.com.tr/mainpage?barcode=${input.trackingNumber}`;
      } else if (carrier === "mng") {
        trackingUrl = `https://www.mngkargo.com.tr/gonderitakip/${input.trackingNumber}`;
      } else if (carrier === "ptt") {
        trackingUrl = `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${input.trackingNumber}`;
      }
    }

    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: "SHIPPED" },
    });

    await tx.shipment.create({
      data: {
        organizationId: context.organization.id,
        salesOrderId: order.id,
        code: shipmentCode,
        carrier: input.carrier || null,
        trackingNumber: input.trackingNumber || null,
        trackingUrl,
        weight: input.weight || null,
        packageCount: input.packageCount || 1,
        status: "IN_TRANSIT",
        shippedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "SHIP",
        entityType: "SalesOrder",
        entityId: order.id,
        summary: `${order.code} kargoya verildi (${shipmentCode})`,
      },
    });
  });
}

export async function deliverOrder(orderId: string, context: AuthContext) {
  if (!dbMode()) return;
  ensurePermission(context, "manage_stock");
  const prisma = getPrisma();

  await prisma.$transaction(async (tx: any) => {
    const order = await tx.salesOrder.findFirst({
      where: { id: orderId, organizationId: context.organization.id, status: "SHIPPED" },
      include: { shipments: true },
    });

    if (!order) {
      throw new Error("Sipariş bulunamadı veya durumu uygun değil.");
    }

    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: "DELIVERED" },
    });

    const activeShipment = order.shipments.find((s: any) => s.status !== "DELIVERED" && s.status !== "RETURNED");
    if (activeShipment) {
      await tx.shipment.update({
        where: { id: activeShipment.id },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "UPDATE",
        entityType: "SalesOrder",
        entityId: order.id,
        summary: `${order.code} teslim edildi`,
      },
    });
  });
}

export async function generateSmartPurchaseOrders(
  suggestions: SuggestedPurchaseOrder[],
  context: AuthContext,
) {
  if (!dbMode()) return;
  ensurePermission(context, "manage_purchasing");

  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    for (const suggestion of suggestions) {
      if (suggestion.recommendedQuantity <= 0) continue;

      const product = await tx.product.findFirst({
        where: { id: suggestion.productId, organizationId: context.organization.id },
      });
      if (!product) continue;

      const count = await tx.purchaseOrder.count({
        where: { organizationId: context.organization.id },
      });

      const supplier = await tx.supplier.findFirst({
        where: { organizationId: context.organization.id, products: { some: { productId: product.id } } },
      });

      if (!supplier) continue;

      const code = `PO-${String(count + 1001).padStart(4, "0")}`;

      const order = await tx.purchaseOrder.create({
        data: {
          organizationId: context.organization.id,
          code,
          supplierId: supplier.id,
          status: "DRAFT",
          lines: {
            create: [{ productId: product.id, quantity: suggestion.recommendedQuantity }],
          },
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          actorId: context.user.id,
          action: "CREATE",
          entityType: "PurchaseOrder",
          entityId: order.id,
          summary: `${code} akıllı satınalma siparişi AI önerisiyle oluşturuldu`,
        },
      });
    }
  });
}

