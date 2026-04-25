import { can } from "@/lib/inventory";
import { getDataSourceMode } from "@/lib/data-source";
import {
  confirmSalesOrder as confirmDemoSalesOrder,
  createProduct as createDemoProduct,
  createPurchaseOrder as createDemoPurchaseOrder,
  createSalesOrder as createDemoSalesOrder,
  createStockMovement as createDemoStockMovement,
  createSupplier as createDemoSupplier,
  getDemoSnapshot,
  receivePurchaseOrder as receiveDemoPurchaseOrder,
} from "@/lib/demo-store";
import { getPrisma } from "@/lib/prisma";
import {
  productInputSchema,
  purchaseOrderInputSchema,
  salesOrderInputSchema,
  stockMovementInputSchema,
  supplierInputSchema,
} from "@/lib/schemas";
import {
  assertEnoughStock,
  buildStockRows,
  getOpenPurchaseOrders,
  getOpenSalesOrders,
} from "@/lib/inventory";
import type {
  AppSnapshot,
  AuthContext,
  Product,
  PurchaseOrder,
  PurchaseOrderLine,
  Role,
  SalesOrder,
  StockMovement,
  StockMovementType,
  Supplier,
  Warehouse,
} from "@/lib/types";

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
    auditLogs,
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
    prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 8,
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
  const stockRows = buildStockRows(
    mappedProducts,
    mappedWarehouses,
    mappedMovements,
  );

  return {
    organization: context.organization,
    user: context.user,
    role: context.role,
    warehouses: mappedWarehouses,
    products: mappedProducts,
    suppliers: mappedSuppliers,
    stockMovements: mappedMovements,
    salesOrders: mappedSalesOrders,
    purchaseOrders: mappedPurchaseOrders,
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

  await getPrisma().product.create({
    data: {
      organizationId: context.organization.id,
      sku: parsed.sku,
      name: parsed.name,
      barcode: parsed.barcode || null,
      category: parsed.category,
      minimumStock: parsed.minimumStock,
    },
  });

  await audit(context, "CREATE", "Product", parsed.sku, `${parsed.sku} ürünü oluşturuldu`);
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

export async function createSupplier(input: unknown, context: AuthContext) {
  if (!dbMode()) {
    return createDemoSupplier(input, context);
  }

  ensurePermission(context, "manage_purchasing");
  const parsed = supplierInputSchema.parse(input);
  const supplier = await getPrisma().supplier.create({
    data: {
      organizationId: context.organization.id,
      name: parsed.name,
      contactName: parsed.contactName || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      leadTimeDays: parsed.leadTimeDays,
    },
  });

  await audit(
    context,
    "CREATE",
    "Supplier",
    supplier.id,
    `${supplier.name} tedarikçisi oluşturuldu`,
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

function nextCode(prefix: string, count: number) {
  return `${prefix}-${String(count + 1001).padStart(4, "0")}`;
}

async function audit(
  context: AuthContext,
  action: "CREATE" | "CONFIRM" | "RECEIVE",
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
