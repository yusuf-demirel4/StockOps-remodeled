import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createInitialState } from "@stockops/core/demo-data";
import {
  assertEnoughStock,
  buildStockRows,
  getOpenPurchaseOrders,
  getOpenSalesOrders,
} from "@stockops/core/inventory";
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
  variantInputSchema,
  variantUpdateInputSchema,
  warehouseInputSchema,
  warehouseUpdateInputSchema,
  customerInputSchema,
  customerUpdateInputSchema,
  invoiceInputSchema,
} from "@stockops/core/schemas";
import type {
  AppState,
  AuthContext,
  Product,
  ProductVariant,
  PurchaseOrder,
  PurchaseOrderLine,
  SalesOrder,
  SalesReturn,
  StockMovement,
  StockMovementType,
  Supplier,
  Warehouse,
} from "@stockops/core/types";
import { getPrisma } from "@stockops/db";
import type { ZodType } from "zod";

type ProductListItem = Product & {
  totalOnHand: number;
};

const globalForApiDemo = globalThis as typeof globalThis & {
  stockOpsApiState?: AppState;
};

function demoState() {
  globalForApiDemo.stockOpsApiState ??= createInitialState();
  return globalForApiDemo.stockOpsApiState;
}

function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new BadRequestException(parsed.error.flatten());
  }

  return parsed.data;
}

function dbMode() {
  return process.env.APP_DATA_SOURCE === "database";
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function nextCode(prefix: string, count: number) {
  return `${prefix}-${String(count + 1001).padStart(4, "0")}`;
}

function assertEnoughStockForApi(
  movements: StockMovement[],
  warehouseId: string,
  lines: { productId: string; quantity: number }[],
) {
  try {
    assertEnoughStock(movements, warehouseId, lines);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Insufficient stock")
    ) {
      throw new BadRequestException(error.message);
    }

    throw error;
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
    unitPrice: Number(product.unitPrice || 0),
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
    createdAt: movement.createdAt.toISOString(),
  };
}

@Injectable()
export class StockOpsApiService {
  async listProducts(context: AuthContext): Promise<ProductListItem[]> {
    if (dbMode()) {
      const [products, rows] = await Promise.all([
        this.listDatabaseProducts(context),
        this.listStockRows(context),
      ]);

      return products.map((product) => ({
        ...product,
        totalOnHand: rows
          .filter((row) => row.product.id === product.id)
          .reduce((total, row) => total + row.onHand, 0),
      }));
    }

    const state = demoState();
    const products = state.products.filter(
      (product) => product.organizationId === context.organization.id,
    );
    const rows = this.listDemoStockRows(context);

    return products.map((product) => ({
      ...product,
      totalOnHand: rows
        .filter((row) => row.product.id === product.id)
        .reduce((total, row) => total + row.onHand, 0),
    }));
  }

  async getProduct(productId: string, context: AuthContext) {
    const product = (await this.listProducts(context)).find(
      (item) => item.id === productId,
    );

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    return product;
  }

  async createProduct(input: unknown, context: AuthContext) {
    const parsed = parseInput(productInputSchema, input);

    if (dbMode()) {
      try {
        const product = await getPrisma().product.create({
          data: {
            organizationId: context.organization.id,
            sku: parsed.sku,
            name: parsed.name,
            barcode: parsed.barcode || null,
            category: parsed.category,
            minimumStock: parsed.minimumStock,
          },
        });
        await this.audit(context, "CREATE", "Product", product.id, parsed.sku);
        return mapProduct(product);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Unique constraint")) {
          throw new ConflictException("SKU already exists.");
        }
        throw error;
      }
    }

    const state = demoState();
    const exists = state.products.some(
      (product) =>
        product.organizationId === context.organization.id &&
        product.sku === parsed.sku,
    );

    if (exists) {
      throw new ConflictException("SKU already exists.");
    }

    const product: Product = {
      ...parsed,
      id: id("prd"),
      organizationId: context.organization.id,
      barcode: parsed.barcode || undefined,
      isActive: true,
      unitPrice: 0,
    };

    state.products.unshift(product);
    return product;
  }

  async updateProduct(productId: string, input: unknown, context: AuthContext) {
    const parsed = parseInput(productUpdateInputSchema, input);

    if (dbMode()) {
      const product = await getPrisma().product.findFirst({
        where: { id: productId, organizationId: context.organization.id },
      });

      if (!product) {
        throw new NotFoundException("Product not found.");
      }

      try {
        const updated = await getPrisma().product.update({
          where: { id: product.id },
          data: {
            sku: parsed.sku,
            name: parsed.name,
            barcode:
              parsed.barcode === undefined ? undefined : parsed.barcode || null,
            category: parsed.category,
            minimumStock: parsed.minimumStock,
          },
        });

        await this.audit(context, "UPDATE", "Product", updated.id, updated.sku);
        return mapProduct(updated);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Unique constraint")) {
          throw new ConflictException("SKU already exists.");
        }
        throw error;
      }
    }

    const state = demoState();
    const product = state.products.find(
      (item) =>
        item.id === productId && item.organizationId === context.organization.id,
    );

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    if (
      parsed.sku &&
      state.products.some(
        (item) =>
          item.organizationId === context.organization.id &&
          item.id !== product.id &&
          item.sku === parsed.sku,
      )
    ) {
      throw new ConflictException("SKU already exists.");
    }

    Object.assign(product, {
      ...parsed,
      barcode: parsed.barcode === "" ? undefined : parsed.barcode,
    });

    return product;
  }

  async deactivateProduct(productId: string, context: AuthContext) {
    if (dbMode()) {
      const product = await getPrisma().product.findFirst({
        where: { id: productId, organizationId: context.organization.id },
      });

      if (!product) {
        throw new NotFoundException("Product not found.");
      }

      const updated = await getPrisma().product.update({
        where: { id: product.id },
        data: { isActive: false },
      });

      await this.audit(context, "UPDATE", "Product", updated.id, updated.sku);
      return mapProduct(updated);
    }

    const product = demoState().products.find(
      (item) =>
        item.id === productId && item.organizationId === context.organization.id,
    );

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    product.isActive = false;
    return product;
  }

  async listSuppliers(context: AuthContext): Promise<Supplier[]> {
    if (dbMode()) {
      const suppliers = await getPrisma().supplier.findMany({
        where: { organizationId: context.organization.id },
        include: { products: true },
        orderBy: { name: "asc" },
      });

      return suppliers.map((supplier) => ({
        id: supplier.id,
        organizationId: supplier.organizationId,
        name: supplier.name,
        contactName: supplier.contactName ?? undefined,
        email: supplier.email ?? undefined,
        phone: supplier.phone ?? undefined,
        leadTimeDays: supplier.leadTimeDays,
        productIds: supplier.products.map((item) => item.productId),
      }));
    }

    return demoState().suppliers.filter(
      (supplier) => supplier.organizationId === context.organization.id,
    );
  }

  async createSupplier(input: unknown, context: AuthContext) {
    const parsed = parseInput(supplierInputSchema, input);

    if (dbMode()) {
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
      await this.audit(context, "CREATE", "Supplier", supplier.id, supplier.name);
      return {
        ...supplier,
        contactName: supplier.contactName ?? undefined,
        email: supplier.email ?? undefined,
        phone: supplier.phone ?? undefined,
        productIds: [],
      };
    }

    const supplier: Supplier = {
      ...parsed,
      id: id("sup"),
      organizationId: context.organization.id,
      email: parsed.email || undefined,
      productIds: [],
    };
    demoState().suppliers.unshift(supplier);
    return supplier;
  }

  async updateSupplier(supplierId: string, input: unknown, context: AuthContext) {
    const parsed = parseInput(supplierUpdateInputSchema, input);

    if (dbMode()) {
      const supplier = await getPrisma().supplier.findFirst({
        where: { id: supplierId, organizationId: context.organization.id },
      });

      if (!supplier) {
        throw new NotFoundException("Supplier not found.");
      }

      const updated = await getPrisma().supplier.update({
        where: { id: supplier.id },
        data: {
          name: parsed.name,
          contactName:
            parsed.contactName === undefined ? undefined : parsed.contactName || null,
          email: parsed.email === undefined ? undefined : parsed.email || null,
          phone: parsed.phone === undefined ? undefined : parsed.phone || null,
          leadTimeDays: parsed.leadTimeDays,
        },
      });

      await this.audit(context, "UPDATE", "Supplier", updated.id, updated.name);
      return {
        ...updated,
        contactName: updated.contactName ?? undefined,
        email: updated.email ?? undefined,
        phone: updated.phone ?? undefined,
        productIds: [],
      };
    }

    const supplier = demoState().suppliers.find(
      (item) =>
        item.id === supplierId && item.organizationId === context.organization.id,
    );

    if (!supplier) {
      throw new NotFoundException("Supplier not found.");
    }

    Object.assign(supplier, {
      ...parsed,
      email: parsed.email === "" ? undefined : parsed.email,
    });
    return supplier;
  }

  async listWarehouses(context: AuthContext): Promise<Warehouse[]> {
    if (dbMode()) {
      const warehouses = await getPrisma().warehouse.findMany({
        where: { organizationId: context.organization.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });

      return warehouses.map(mapWarehouse);
    }

    return demoState().warehouses.filter(
      (warehouse) => warehouse.organizationId === context.organization.id,
    );
  }

  async createWarehouse(input: unknown, context: AuthContext) {
    const parsed = parseInput(warehouseInputSchema, input);

    if (dbMode()) {
      const prisma = getPrisma();

      try {
        return await prisma.$transaction(async (tx) => {
          const warehouseCount = await tx.warehouse.count({
            where: { organizationId: context.organization.id },
          });
          const isDefault = parsed.isDefault === true || warehouseCount === 0;

          if (isDefault) {
            await tx.warehouse.updateMany({
              where: {
                organizationId: context.organization.id,
                isDefault: true,
              },
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
              summary: warehouse.code,
            },
          });

          return mapWarehouse(warehouse);
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("Unique constraint")) {
          throw new ConflictException("Warehouse code already exists.");
        }

        throw error;
      }
    }

    const state = demoState();
    const organizationWarehouses = state.warehouses.filter(
      (warehouse) => warehouse.organizationId === context.organization.id,
    );

    if (
      organizationWarehouses.some((warehouse) => warehouse.code === parsed.code)
    ) {
      throw new ConflictException("Warehouse code already exists.");
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
      organizationId: context.organization.id,
      code: parsed.code,
      name: parsed.name,
      isDefault,
    };

    state.warehouses.push(warehouse);
    return warehouse;
  }

  async updateWarehouse(
    warehouseId: string,
    input: unknown,
    context: AuthContext,
  ) {
    const parsed = parseInput(warehouseUpdateInputSchema, input);

    if (dbMode()) {
      const prisma = getPrisma();
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, organizationId: context.organization.id },
      });

      if (!warehouse) {
        throw new NotFoundException("Warehouse not found.");
      }

      try {
        return await prisma.$transaction(async (tx) => {
          if (parsed.isDefault === true) {
            await tx.warehouse.updateMany({
              where: {
                organizationId: context.organization.id,
                isDefault: true,
              },
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
              summary: updated.code,
            },
          });

          return mapWarehouse(updated);
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("Unique constraint")) {
          throw new ConflictException("Warehouse code already exists.");
        }

        throw error;
      }
    }

    const state = demoState();
    const organizationWarehouses = state.warehouses.filter(
      (warehouse) => warehouse.organizationId === context.organization.id,
    );
    const warehouse = organizationWarehouses.find(
      (item) => item.id === warehouseId,
    );

    if (!warehouse) {
      throw new NotFoundException("Warehouse not found.");
    }

    if (
      parsed.code &&
      organizationWarehouses.some(
        (item) => item.id !== warehouse.id && item.code === parsed.code,
      )
    ) {
      throw new ConflictException("Warehouse code already exists.");
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

    return warehouse;
  }

  async listStockRows(context: AuthContext) {
    if (dbMode()) {
      const [products, warehouses, stockMovements] = await Promise.all([
        this.listDatabaseProducts(context),
        this.listWarehouses(context),
        this.listStockMovements(context),
      ]);

      return buildStockRows(products, warehouses, stockMovements);
    }

    return this.listDemoStockRows(context);
  }

  async listCriticalStockRows(context: AuthContext) {
    return (await this.listStockRows(context)).filter((row) => row.isCritical);
  }

  async listStockMovements(context: AuthContext): Promise<StockMovement[]> {
    if (dbMode()) {
      const movements = await getPrisma().stockMovement.findMany({
        where: { organizationId: context.organization.id },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      return movements.map(mapStockMovement);
    }

    return demoState().stockMovements
      .filter((movement) => movement.organizationId === context.organization.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createStockMovement(input: unknown, context: AuthContext) {
    const parsed = parseInput(stockMovementInputSchema, input);
    await this.ensureProductExists(parsed.productId, context);
    await this.ensureWarehouseExists(parsed.warehouseId, context);

    const quantityChange =
      parsed.type === "OUTBOUND" ? -parsed.quantity : parsed.quantity;

    if (quantityChange < 0) {
      const movements = await this.listStockMovements(context);
      assertEnoughStockForApi(movements, parsed.warehouseId, [
        { productId: parsed.productId, quantity: parsed.quantity },
      ]);
    }

    if (dbMode()) {
      const movement = await getPrisma().stockMovement.create({
        data: {
          organizationId: context.organization.id,
          warehouseId: parsed.warehouseId,
          productId: parsed.productId,
          type: parsed.type,
          quantityChange,
          note: parsed.note || null,
          createdById: context.user.id,
        },
      });
      await this.audit(
        context,
        "CREATE",
        "StockMovement",
        movement.id,
        parsed.type,
      );
      return mapStockMovement(movement);
    }

    const movement: StockMovement = {
      id: id("mov"),
      organizationId: context.organization.id,
      warehouseId: parsed.warehouseId,
      productId: parsed.productId,
      type: parsed.type,
      quantityChange,
      note: parsed.note || undefined,
      createdById: context.user.id,
      createdAt: new Date().toISOString(),
    };

    demoState().stockMovements.unshift(movement);
    return movement;
  }

  async createStockTransfer(input: unknown, context: AuthContext) {
    const parsed = parseInput(stockTransferInputSchema, input);
    await this.ensureProductExists(parsed.productId, context);
    await this.ensureWarehouseExists(parsed.sourceWarehouseId, context);
    await this.ensureWarehouseExists(parsed.destinationWarehouseId, context);

    const sourceMovements = (await this.listStockMovements(context)).filter(
      (movement) =>
        movement.productId === parsed.productId &&
        movement.warehouseId === parsed.sourceWarehouseId,
    );

    assertEnoughStockForApi(sourceMovements, parsed.sourceWarehouseId, [
      { productId: parsed.productId, quantity: parsed.quantity },
    ]);

    if (dbMode()) {
      const prisma = getPrisma();
      const [sourceWarehouse, destinationWarehouse, transferMovementCount] =
        await Promise.all([
          prisma.warehouse.findFirstOrThrow({
            where: {
              id: parsed.sourceWarehouseId,
              organizationId: context.organization.id,
            },
          }),
          prisma.warehouse.findFirstOrThrow({
            where: {
              id: parsed.destinationWarehouseId,
              organizationId: context.organization.id,
            },
          }),
          prisma.stockMovement.count({
            where: { organizationId: context.organization.id, type: "TRANSFER" },
          }),
        ]);
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
      });

      await this.audit(context, "CREATE", "StockTransfer", reference, reference);

      const movements = await prisma.stockMovement.findMany({
        where: { organizationId: context.organization.id, reference },
        orderBy: { quantityChange: "asc" },
      });

      return { movements: movements.map(mapStockMovement), reference };
    }

    const state = demoState();
    const sourceWarehouse = state.warehouses.find(
      (warehouse) =>
        warehouse.id === parsed.sourceWarehouseId &&
        warehouse.organizationId === context.organization.id,
    );
    const destinationWarehouse = state.warehouses.find(
      (warehouse) =>
        warehouse.id === parsed.destinationWarehouseId &&
        warehouse.organizationId === context.organization.id,
    );

    if (!sourceWarehouse || !destinationWarehouse) {
      throw new NotFoundException("Warehouse not found.");
    }

    const reference = nextCode(
      "TR",
      Math.floor(
        state.stockMovements.filter(
          (movement) =>
            movement.organizationId === context.organization.id &&
            movement.type === "TRANSFER",
        ).length / 2,
      ),
    );
    const createdAt = new Date().toISOString();
    const movements: StockMovement[] = [
      {
        id: id("mov"),
        organizationId: context.organization.id,
        warehouseId: parsed.sourceWarehouseId,
        productId: parsed.productId,
        type: "TRANSFER",
        quantityChange: -parsed.quantity,
        reference,
        note: parsed.note || `Transfer to ${destinationWarehouse.name}`,
        createdById: context.user.id,
        createdAt,
      },
      {
        id: id("mov"),
        organizationId: context.organization.id,
        warehouseId: parsed.destinationWarehouseId,
        productId: parsed.productId,
        type: "TRANSFER",
        quantityChange: parsed.quantity,
        reference,
        note: parsed.note || `Transfer from ${sourceWarehouse.name}`,
        createdById: context.user.id,
        createdAt,
      },
    ];

    state.stockMovements.unshift(...movements);

    return { movements, reference };
  }

  async listSalesOrders(context: AuthContext): Promise<SalesOrder[]> {
    if (dbMode()) {
      const orders = await getPrisma().salesOrder.findMany({
        where: { organizationId: context.organization.id },
        include: { lines: true },
        orderBy: { createdAt: "desc" },
      });

      return orders.map((order) => ({
        id: order.id,
        organizationId: order.organizationId,
        code: order.code,
        customerName: order.customerName,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        lines: order.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
      }));
    }

    return demoState().salesOrders.filter(
      (order) => order.organizationId === context.organization.id,
    );
  }

  async listOpenSalesOrders(context: AuthContext) {
    return getOpenSalesOrders(await this.listSalesOrders(context));
  }

  async createSalesOrder(input: unknown, context: AuthContext) {
    const parsed = parseInput(salesOrderInputSchema, input);
    await this.ensureProductExists(parsed.productId, context);

    if (dbMode()) {
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
        include: { lines: true },
      });

      await this.audit(context, "CREATE", "SalesOrder", order.id, order.code);
      return (await this.listSalesOrders(context)).find((item) => item.id === order.id);
    }

    const state = demoState();
    const order: SalesOrder = {
      id: id("so"),
      organizationId: context.organization.id,
      code: nextCode("SO", state.salesOrders.length),
      customerName: parsed.customerName,
      status: "DRAFT",
      lines: [{ productId: parsed.productId, quantity: parsed.quantity }],
      createdAt: new Date().toISOString(),
    };
    state.salesOrders.unshift(order);
    return order;
  }

  async confirmSalesOrder(orderId: string, context: AuthContext) {
    if (dbMode()) {
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
          throw new NotFoundException("Sales order or default warehouse not found.");
        }

        const movements = await tx.stockMovement.findMany({
          where: {
            organizationId: context.organization.id,
            warehouseId: warehouse.id,
            productId: { in: order.lines.map((line) => line.productId) },
          },
        });

        assertEnoughStockForApi(
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
            note: "Sales order confirmed",
            createdById: context.user.id,
          })),
        });
      });

      await this.audit(context, "CONFIRM", "SalesOrder", orderId, orderId);
      return (await this.listSalesOrders(context)).find((order) => order.id === orderId);
    }

    const state = demoState();
    const warehouse = state.warehouses.find(
      (item) =>
        item.organizationId === context.organization.id && item.isDefault,
    );
    const order = state.salesOrders.find(
      (item) => item.id === orderId && item.organizationId === context.organization.id,
    );

    if (!warehouse || !order) {
      throw new NotFoundException("Sales order or default warehouse not found.");
    }

    assertEnoughStockForApi(state.stockMovements, warehouse.id, order.lines);
    order.status = "CONFIRMED";
    order.lines.forEach((line) => {
      state.stockMovements.unshift({
        id: id("mov"),
        organizationId: context.organization.id,
        warehouseId: warehouse.id,
        productId: line.productId,
        type: "SALE",
        quantityChange: -line.quantity,
        reference: order.code,
        note: "Sales order confirmed",
        createdById: context.user.id,
        createdAt: new Date().toISOString(),
      });
    });

    return order;
  }

  async listPurchaseOrders(context: AuthContext): Promise<PurchaseOrder[]> {
    if (dbMode()) {
      const orders = await getPrisma().purchaseOrder.findMany({
        where: { organizationId: context.organization.id },
        include: { lines: true },
        orderBy: { createdAt: "desc" },
      });

      return orders.map((order) => ({
        id: order.id,
        organizationId: order.organizationId,
        supplierId: order.supplierId,
        code: order.code,
        status: order.status,
        expectedDate: order.expectedDate?.toISOString(),
        createdAt: order.createdAt.toISOString(),
        lines: order.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          receivedQuantity: line.receivedQuantity,
        })),
      }));
    }

    return demoState().purchaseOrders.filter(
      (order) => order.organizationId === context.organization.id,
    );
  }

  async listOpenPurchaseOrders(context: AuthContext) {
    return getOpenPurchaseOrders(await this.listPurchaseOrders(context));
  }

  async createPurchaseOrder(input: unknown, context: AuthContext) {
    const parsed = parseInput(purchaseOrderInputSchema, input);
    await this.ensureSupplierExists(parsed.supplierId, context);
    await this.ensureProductExists(parsed.productId, context);

    if (dbMode()) {
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

      await this.audit(context, "CREATE", "PurchaseOrder", order.id, order.code);
      return (await this.listPurchaseOrders(context)).find(
        (item) => item.id === order.id,
      );
    }

    const state = demoState();
    const order: PurchaseOrder = {
      id: id("po"),
      organizationId: context.organization.id,
      code: nextCode("PO", state.purchaseOrders.length),
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
    state.purchaseOrders.unshift(order);
    return order;
  }

  async receivePurchaseOrder(orderId: string, context: AuthContext) {
    if (dbMode()) {
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
          throw new NotFoundException("Purchase order or default warehouse not found.");
        }

        const receipts: PurchaseOrderLine[] = order.lines
          .map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            receivedQuantity: line.receivedQuantity,
          }))
          .filter((line) => line.quantity > line.receivedQuantity);

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
            note: "Purchase order received",
            createdById: context.user.id,
          })),
        });
        await tx.purchaseOrder.update({
          where: { id: order.id },
          data: { status: "COMPLETED" },
        });
      });

      await this.audit(context, "RECEIVE", "PurchaseOrder", orderId, orderId);
      return (await this.listPurchaseOrders(context)).find(
        (order) => order.id === orderId,
      );
    }

    const state = demoState();
    const warehouse = state.warehouses.find(
      (item) =>
        item.organizationId === context.organization.id && item.isDefault,
    );
    const order = state.purchaseOrders.find(
      (item) => item.id === orderId && item.organizationId === context.organization.id,
    );

    if (!warehouse || !order) {
      throw new NotFoundException("Purchase order or default warehouse not found.");
    }

    order.lines.forEach((line) => {
      const remaining = line.quantity - line.receivedQuantity;

      if (remaining <= 0) {
        return;
      }

      line.receivedQuantity += remaining;
      state.stockMovements.unshift({
        id: id("mov"),
        organizationId: context.organization.id,
        warehouseId: warehouse.id,
        productId: line.productId,
        type: "PURCHASE_RECEIPT",
        quantityChange: remaining,
        reference: order.code,
        note: "Purchase order received",
        createdById: context.user.id,
        createdAt: new Date().toISOString(),
      });
    });
    order.status = "COMPLETED";
    return order;
  }

  
  async listCustomers(context: AuthContext, query?: any) {
    if (dbMode()) {
      const customers = await getPrisma().customer.findMany({
        where: { organizationId: context.organization.id },
        orderBy: { name: "asc" },
      });
      return customers.map((c) => ({
        ...c,
        email: c.email ?? undefined,
        phone: c.phone ?? undefined,
        taxId: c.taxId ?? undefined,
        address: c.address ?? undefined,
        createdAt: c.createdAt.toISOString(),
      }));
    }
    return demoState().customers.filter((c) => c.organizationId === context.organization.id);
  }

  async createCustomer(input: unknown, context: AuthContext) {
    const parsed = parseInput(customerInputSchema, input);
    if (dbMode()) {
      const customer = await getPrisma().customer.create({
        data: {
          organizationId: context.organization.id,
          code: parsed.code,
          name: parsed.name,
          email: parsed.email || null,
          phone: parsed.phone || null,
          taxId: parsed.taxId || null,
          address: parsed.address || null,
          paymentTermDays: parsed.paymentTermDays,
        },
      });
      await this.audit(context, "CREATE", "Customer", customer.id, customer.name);
      return customer;
    }
    const customer = {
      ...parsed,
      id: id("cus"),
      organizationId: context.organization.id,
      email: parsed.email || undefined,
      phone: parsed.phone || undefined,
      taxId: parsed.taxId || undefined,
      address: parsed.address || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    demoState().customers.unshift(customer);
    return customer;
  }

  async updateCustomer(customerId: string, input: unknown, context: AuthContext) {
    const parsed = parseInput(customerUpdateInputSchema, input);
    if (dbMode()) {
      const customer = await getPrisma().customer.findFirst({
        where: { id: customerId, organizationId: context.organization.id },
      });
      if (!customer) throw new NotFoundException("Customer not found.");
      
      const updated = await getPrisma().customer.update({
        where: { id: customerId },
        data: {
          code: parsed.code,
          name: parsed.name,
          email: parsed.email === undefined ? undefined : parsed.email || null,
          phone: parsed.phone === undefined ? undefined : parsed.phone || null,
          taxId: parsed.taxId === undefined ? undefined : parsed.taxId || null,
          address: parsed.address === undefined ? undefined : parsed.address || null,
          paymentTermDays: parsed.paymentTermDays,
        },
      });
      await this.audit(context, "UPDATE", "Customer", updated.id, updated.name);
      return updated;
    }
    const customer = demoState().customers.find((c) => c.id === customerId && c.organizationId === context.organization.id);
    if (!customer) throw new NotFoundException("Customer not found.");
    Object.assign(customer, {
      ...parsed,
      email: parsed.email === "" ? undefined : parsed.email,
    });
    return customer;
  }

  async listInvoices(context: AuthContext, query?: any) {
    if (dbMode()) {
      const invoices = await getPrisma().invoice.findMany({
        where: { organizationId: context.organization.id },
        include: { lines: true },
        orderBy: { createdAt: "desc" },
      });
      return invoices.map(inv => ({
        ...inv,
        subtotal: Number(inv.subtotal),
        discountAmount: Number(inv.discountAmount),
        taxRate: Number(inv.taxRate),
        taxAmount: Number(inv.taxAmount),
        total: Number(inv.total),
        lines: inv.lines.map(l => ({
          ...l,
          unitPrice: Number(l.unitPrice),
          discount: Number(l.discount),
          lineTotal: Number(l.lineTotal),
        })),
        createdAt: inv.createdAt.toISOString(),
      }));
    }
    return demoState().invoices.filter((i) => i.organizationId === context.organization.id);
  }

  async createInvoice(input: unknown, context: AuthContext) {
    const parsed = parseInput(invoiceInputSchema, input);
    
    // Calculate totals
    let subtotal = 0;
    const linesWithTotals = parsed.lines.map(line => {
      const lineTotal = line.quantity * line.unitPrice * (1 - (line.discount || 0) / 100);
      subtotal += lineTotal;
      return { ...line, lineTotal };
    });
    
    const taxAmount = subtotal * (parsed.taxRate || 0);
    const total = subtotal + taxAmount;
    
    if (dbMode()) {
      const count = await getPrisma().invoice.count({
        where: { organizationId: context.organization.id },
      });
      const invoice = await getPrisma().invoice.create({
        data: {
          organizationId: context.organization.id,
          customerId: parsed.customerId,
          code: nextCode("INV", count),
          status: "DRAFT",
          dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
          currency: parsed.currency,
          notes: parsed.notes,
          taxRate: parsed.taxRate,
          subtotal,
          taxAmount,
          total,
          lines: {
            create: linesWithTotals.map(l => ({
              productId: l.productId,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.discount,
              lineTotal: l.lineTotal,
            })),
          },
        },
        include: { lines: true },
      });
      await this.audit(context, "CREATE", "Invoice", invoice.id, invoice.code);
      return {
        ...invoice,
        issuedAt: invoice.issuedAt?.toISOString(),
        dueDate: invoice.dueDate?.toISOString(),
        notes: invoice.notes ?? undefined,
        subtotal: Number(invoice.subtotal),
        discountAmount: Number(invoice.discountAmount),
        taxRate: Number(invoice.taxRate),
        taxAmount: Number(invoice.taxAmount),
        total: Number(invoice.total),
        lines: invoice.lines.map(l => ({
          ...l,
          unitPrice: Number(l.unitPrice),
          discount: Number(l.discount),
          lineTotal: Number(l.lineTotal),
        })),
        createdAt: invoice.createdAt.toISOString(),
      };
    }
    
    const invoice = {
      ...parsed,
      id: id("inv"),
      organizationId: context.organization.id,
      code: nextCode("INV", demoState().invoices.length),
      status: "DRAFT" as const,
      subtotal,
      discountAmount: 0,
      taxAmount,
      total,
      dueDate: parsed.dueDate || undefined,
      notes: parsed.notes || undefined,
      lines: linesWithTotals,
      createdAt: new Date().toISOString(),
    };
    demoState().invoices.unshift(invoice);
    return invoice;
  }

  async listProductVariants(
    productId: string,
    context: AuthContext,
  ): Promise<ProductVariant[]> {
    if (!dbMode()) {
      return [];
    }

    const prisma = getPrisma();
    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId: context.organization.id },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    const variants = await prisma.productVariant.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "asc" },
    });

    return variants.map((variant) => ({
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
    }));
  }

  async createProductVariant(
    productId: string,
    input: unknown,
    context: AuthContext,
  ): Promise<ProductVariant> {
    if (!dbMode()) {
      throw new BadRequestException(
        "Variant management requires database mode.",
      );
    }

    const parsed = parseInput(variantInputSchema, {
      ...((input as Record<string, unknown>) ?? {}),
      productId,
    });

    const prisma = getPrisma();
    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId: context.organization.id },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    const attributes = this.parseVariantAttributes(parsed.attributes);

    try {
      const variant = await prisma.productVariant.create({
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
      });

      await this.audit(
        context,
        "CREATE",
        "ProductVariant",
        variant.id,
        variant.sku,
      );

      return {
        id: variant.id,
        productId: variant.productId,
        sku: variant.sku,
        name: variant.name,
        barcode: variant.barcode ?? undefined,
        unitPrice: Number(variant.unitPrice),
        costPrice: variant.costPrice ? Number(variant.costPrice) : undefined,
        weight: variant.weight ? Number(variant.weight) : undefined,
        isActive: variant.isActive,
        attributes,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        throw new ConflictException("Variant SKU already exists.");
      }
      throw error;
    }
  }

  async updateProductVariant(
    variantId: string,
    input: unknown,
    context: AuthContext,
  ): Promise<ProductVariant> {
    if (!dbMode()) {
      throw new BadRequestException(
        "Variant management requires database mode.",
      );
    }

    const parsed = parseInput(variantUpdateInputSchema, input);
    const prisma = getPrisma();

    const existing = await prisma.productVariant.findFirst({
      where: { id: variantId },
      include: { product: { select: { organizationId: true } } },
    });

    if (
      !existing ||
      existing.product.organizationId !== context.organization.id
    ) {
      throw new NotFoundException("Variant not found.");
    }

    const attributes =
      parsed.attributes !== undefined
        ? this.parseVariantAttributes(parsed.attributes)
        : undefined;

    try {
      const updated = await prisma.productVariant.update({
        where: { id: existing.id },
        data: {
          sku: parsed.sku,
          name: parsed.name,
          barcode:
            parsed.barcode === undefined ? undefined : parsed.barcode || null,
          unitPrice: parsed.unitPrice,
          costPrice:
            parsed.costPrice === undefined
              ? undefined
              : parsed.costPrice ?? null,
          weight:
            parsed.weight === undefined ? undefined : parsed.weight ?? null,
          attributes,
        },
      });

      await this.audit(
        context,
        "UPDATE",
        "ProductVariant",
        updated.id,
        updated.sku,
      );

      return {
        id: updated.id,
        productId: updated.productId,
        sku: updated.sku,
        name: updated.name,
        barcode: updated.barcode ?? undefined,
        unitPrice: Number(updated.unitPrice),
        costPrice: updated.costPrice ? Number(updated.costPrice) : undefined,
        weight: updated.weight ? Number(updated.weight) : undefined,
        isActive: updated.isActive,
        attributes: (updated.attributes as Record<string, string>) ?? {},
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        throw new ConflictException("Variant SKU already exists.");
      }
      throw error;
    }
  }

  async deleteProductVariant(variantId: string, context: AuthContext) {
    if (!dbMode()) {
      throw new BadRequestException(
        "Variant management requires database mode.",
      );
    }

    const prisma = getPrisma();
    const existing = await prisma.productVariant.findFirst({
      where: { id: variantId },
      include: { product: { select: { organizationId: true } } },
    });

    if (
      !existing ||
      existing.product.organizationId !== context.organization.id
    ) {
      throw new NotFoundException("Variant not found.");
    }

    await prisma.productVariant.delete({ where: { id: existing.id } });
    await this.audit(
      context,
      "UPDATE",
      "ProductVariant",
      existing.id,
      `${existing.sku} deleted`,
    );

    return { id: existing.id, deleted: true };
  }

  private parseVariantAttributes(value: string | undefined) {
    if (!value) {
      return {};
    }

    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }

      throw new Error("not-object");
    } catch {
      throw new BadRequestException(
        "Variant attributes must be a JSON object string.",
      );
    }
  }

  async listSalesReturns(context: AuthContext): Promise<SalesReturn[]> {
    if (!dbMode()) {
      return [];
    }

    const returns = await getPrisma().salesReturn.findMany({
      where: { organizationId: context.organization.id },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    });

    return returns.map((salesReturn) => ({
      id: salesReturn.id,
      organizationId: salesReturn.organizationId,
      salesOrderId: salesReturn.salesOrderId,
      code: salesReturn.code,
      reason: salesReturn.reason ?? undefined,
      status: salesReturn.status,
      createdAt: salesReturn.createdAt.toISOString(),
      lines: salesReturn.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        restocked: line.restocked,
      })),
    }));
  }

  async createSalesReturn(input: unknown, context: AuthContext) {
    if (!dbMode()) {
      throw new BadRequestException(
        "Sales returns require database mode.",
      );
    }

    const parsed = parseInput(salesReturnInputSchema, input);
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
      throw new NotFoundException(
        "Confirmed sales order not found.",
      );
    }

    for (const line of parsed.lines) {
      const orderLine = order.lines.find(
        (ol) => ol.productId === line.productId,
      );

      if (!orderLine) {
        throw new BadRequestException(
          `Product ${line.productId} is not part of this order.`,
        );
      }

      if (line.quantity > orderLine.quantity) {
        throw new BadRequestException(
          `Return quantity exceeds ordered quantity (${orderLine.quantity}).`,
        );
      }
    }

    const count = await prisma.salesReturn.count({
      where: { organizationId: context.organization.id },
    });
    const code = nextCode("RET", count);

    const created = await prisma.$transaction(async (tx) => {
      const salesReturn = await tx.salesReturn.create({
        data: {
          organizationId: context.organization.id,
          salesOrderId: order.id,
          code,
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
          entityId: salesReturn.id,
          summary: `${code} return created (order: ${order.code})`,
        },
      });

      return salesReturn;
    });

    return {
      id: created.id,
      organizationId: created.organizationId,
      salesOrderId: created.salesOrderId,
      code: created.code,
      reason: created.reason ?? undefined,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
      lines: created.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        restocked: line.restocked,
      })),
    };
  }

  async approveSalesReturn(returnId: string, context: AuthContext) {
    if (!dbMode()) {
      throw new BadRequestException(
        "Sales returns require database mode.",
      );
    }

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
        throw new NotFoundException(
          "Sales return not found or already processed.",
        );
      }

      const warehouse = await tx.warehouse.findFirst({
        where: {
          organizationId: context.organization.id,
          isDefault: true,
        },
      });

      if (!warehouse) {
        throw new NotFoundException("Default warehouse not found.");
      }

      await tx.stockMovement.createMany({
        data: salesReturn.lines.map((line) => ({
          organizationId: context.organization.id,
          warehouseId: warehouse.id,
          productId: line.productId,
          type: "INBOUND" as const,
          quantityChange: line.quantity,
          reference: salesReturn.code,
          note: `Return for ${salesReturn.salesOrder.code}`,
          createdById: context.user.id,
        })),
      });

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
          summary: `${salesReturn.code} approved, stock reinstated`,
        },
      });
    });

    return (await this.listSalesReturns(context)).find(
      (item) => item.id === returnId,
    );
  }

  private async listDatabaseProducts(context: AuthContext): Promise<Product[]> {
    const products = await getPrisma().product.findMany({
      where: { organizationId: context.organization.id },
      orderBy: { name: "asc" },
    });

    return products.map(mapProduct);
  }

  private listDemoStockRows(context: AuthContext) {
    const state = demoState();
    return buildStockRows(
      state.products.filter(
        (product) => product.organizationId === context.organization.id,
      ),
      state.warehouses.filter(
        (warehouse) => warehouse.organizationId === context.organization.id,
      ),
      state.stockMovements.filter(
        (movement) => movement.organizationId === context.organization.id,
      ),
    );
  }

  private async ensureProductExists(productId: string, context: AuthContext) {
    if (dbMode()) {
      const product = await getPrisma().product.findFirst({
        where: {
          id: productId,
          isActive: true,
          organizationId: context.organization.id,
        },
        select: { id: true },
      });

      if (!product) {
        throw new NotFoundException("Product not found.");
      }

      return;
    }

    const product = demoState().products.find(
      (item) =>
        item.id === productId &&
        item.isActive &&
        item.organizationId === context.organization.id,
    );

    if (!product) {
      throw new NotFoundException("Product not found.");
    }
  }

  private async ensureSupplierExists(supplierId: string, context: AuthContext) {
    if (dbMode()) {
      const supplier = await getPrisma().supplier.findFirst({
        where: {
          id: supplierId,
          organizationId: context.organization.id,
        },
        select: { id: true },
      });

      if (!supplier) {
        throw new NotFoundException("Supplier not found.");
      }

      return;
    }

    const supplier = demoState().suppliers.find(
      (item) =>
        item.id === supplierId && item.organizationId === context.organization.id,
    );

    if (!supplier) {
      throw new NotFoundException("Supplier not found.");
    }
  }

  private async ensureWarehouseExists(warehouseId: string, context: AuthContext) {
    if (dbMode()) {
      const warehouse = await getPrisma().warehouse.findFirst({
        where: {
          id: warehouseId,
          organizationId: context.organization.id,
        },
        select: { id: true },
      });

      if (!warehouse) {
        throw new NotFoundException("Warehouse not found.");
      }

      return;
    }

    const warehouse = demoState().warehouses.find(
      (item) =>
        item.id === warehouseId && item.organizationId === context.organization.id,
    );

    if (!warehouse) {
      throw new NotFoundException("Warehouse not found.");
    }
  }

  private async audit(
    context: AuthContext,
    action: "CREATE" | "UPDATE" | "CONFIRM" | "RECEIVE",
    entityType: string,
    entityId: string,
    summary: string,
  ) {
    if (!dbMode()) {
      return;
    }

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
}
