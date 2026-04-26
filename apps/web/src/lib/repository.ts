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
  createWarehouse as createDemoWarehouse,
  getDemoSnapshot,
  receivePurchaseOrder as receiveDemoPurchaseOrder,
  setProductActive as setDemoProductActive,
  updateProduct as updateDemoProduct,
  updateSupplier as updateDemoSupplier,
  updateWarehouse as updateDemoWarehouse,
} from "@/lib/demo-store";
import { getPrisma } from "@/lib/prisma";
import {
  productInputSchema,
  productUpdateInputSchema,
  purchaseOrderInputSchema,
  salesOrderInputSchema,
  stockMovementInputSchema,
  stockTransferInputSchema,
  supplierInputSchema,
  supplierUpdateInputSchema,
  warehouseInputSchema,
  warehouseUpdateInputSchema,
} from "@stockops/core/schemas";
import {
  assertEnoughStock,
  buildStockRows,
  getOpenPurchaseOrders,
  getOpenSalesOrders,
} from "@stockops/core/inventory";
import type {
  AppSnapshot,
  AuthContext,
  Product,
  PurchaseOrder,
  PurchaseOrderLine,
  SalesOrder,
  StockMovement,
  StockMovementType,
  Supplier,
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

function nextCode(prefix: string, count: number) {
  return `${prefix}-${String(count + 1001).padStart(4, "0")}`;
}

async function audit(
  context: AuthContext,
  action: "CREATE" | "UPDATE" | "CONFIRM" | "RECEIVE",
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
