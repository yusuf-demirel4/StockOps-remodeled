import { can } from "@stockops/core/inventory";
import { getDataSourceMode } from "@/lib/data-source";
import {
  confirmSalesOrder as confirmDemoSalesOrder,
  createProduct as createDemoProduct,
  createPurchaseOrder as createDemoPurchaseOrder,
  createSalesOrder as createDemoSalesOrder,
  createStockMovement as createDemoStockMovement,
  createStockTransfer as createDemoStockTransfer,
  createSupplier as createDemoSupplier,
  createUser as createDemoUser,
  createWarehouse as createDemoWarehouse,
  deleteUser as deleteDemoUser,
  getDemoSnapshot,
  receivePurchaseOrder as receiveDemoPurchaseOrder,
  setProductActive as setDemoProductActive,
  updateProduct as updateDemoProduct,
  updateSupplier as updateDemoSupplier,
  updateUserRole as updateDemoUserRole,
  updateWarehouse as updateDemoWarehouse,
} from "@/lib/demo-store";
import { getPrisma } from "@/lib/prisma";
import {
  productInputSchema,
  productUpdateInputSchema,
  purchaseOrderInputSchema,
  salesOrderInputSchema,
  salesReturnInputSchema,
  stockMovementInputSchema,
  stockTransferInputSchema,
  supplierInputSchema,
  supplierUpdateInputSchema,
  userInputSchema,
  userUpdateRoleSchema,
  variantInputSchema,
  variantUpdateInputSchema,
  warehouseInputSchema,
  warehouseUpdateInputSchema,
} from "@stockops/core/schemas";
import {
  assertEnoughStock,
  buildStockRows,
  getOpenPurchaseOrders,
  getOpenSalesOrders,
} from "@stockops/core/inventory";
import { hashPassword } from "@stockops/core/password";
import type {
  AppSnapshot,
  AuthContext,
  Member,
  NotificationDelivery,
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
  unitPrice?: number | null;
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
    notificationDeliveries,
    memberships,
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
    webhookEvents: webhookEvents.map(mapWebhookEvent),
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function nextCode(prefix: string, count: number) {
  return `${prefix}-${String(count + 1001).padStart(4, "0")}`;
}

async function audit(
  context: AuthContext,
  action: "CREATE" | "UPDATE" | "CONFIRM" | "RECEIVE" | "CANCEL" | "PICK" | "PACK" | "SHIP",
  entityType: string,
  entityId: string,
  summary: string,
) {
  await getPrisma().auditLog.create({
    data: {
      organizationId: context.organization.id,
      actorId: context.user.id,
      action,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    return { order: mockOrder, pickLists: [] };
  }
  const prisma = getPrisma();
  const order = await prisma.salesOrder.findFirst({
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
  const pickLists = await prisma.pickList.findMany({
    where: { organizationId: context.organization.id, id: { in: order.pickListItems.map(i => i.pickListId) } },
    include: { items: { include: { product: true } } },
  });
  return { order, pickLists };
}

export async function startPicking(orderId: string, context: AuthContext) {
  if (!dbMode()) return;
  ensurePermission(context, "manage_stock");
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
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

    const count = await tx.pickList.count({
      where: { organizationId: context.organization.id },
    });
    
    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: "PICKING" },
    });

    const pickList = await tx.pickList.create({
      data: {
        organizationId: context.organization.id,
        warehouseId: warehouse.id,
        status: "PENDING",
        priority: 1,
        items: {
          create: order.lines.map((line) => ({
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

  await prisma.$transaction(async (tx) => {
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

  await prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findFirst({
      where: { id: orderId, organizationId: context.organization.id, status: "PICKING" },
      include: { pickListItems: true },
    });

    if (!order) {
      throw new Error("Sipariş bulunamadı veya durumu uygun değil.");
    }

    const allPicked = order.pickListItems.every(item => item.pickedQty >= item.quantity);
    if (!allPicked) {
      throw new Error("Tüm ürünler tam olarak toplanmadan paketleme yapılamaz.");
    }

    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: "PACKED" },
    });

    const pickListIds = [...new Set(order.pickListItems.map(i => i.pickListId))];
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

  await prisma.$transaction(async (tx) => {
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

  await prisma.$transaction(async (tx) => {
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

    const activeShipment = order.shipments.find(s => s.status !== "DELIVERED" && s.status !== "RETURNED");
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
