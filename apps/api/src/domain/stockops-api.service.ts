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
import { adjustBalance, adjustReservation, getPrisma } from "@stockops/db";
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

function mapBalanceToStockRow(row: any) {
  return {
    product: {
      id: row.p_id,
      organizationId: row.p_orgId,
      sku: row.sku,
      name: row.p_name,
      barcode: row.barcode ?? undefined,
      category: row.category,
      description: row.description ?? undefined,
      minimumStock: row.minimumStock,
      isActive: row.isActive,
      unitPrice: Number(row.unitPrice || 0),
    },
    warehouse: {
      id: row.w_id,
      organizationId: row.w_orgId,
      code: row.w_code,
      name: row.w_name,
      isDefault: row.isDefault,
    },
    onHand: Number(row.onHand),
    reserved: Number(row.reserved ?? 0),
    available: Number(row.available ?? 0),
    minimumStock: row.minimumStock,
    isCritical: Number(row.onHand) <= row.minimumStock,
  };
}

@Injectable()
export class StockOpsApiService {
  async listProducts(context: AuthContext): Promise<ProductListItem[]> {
    if (dbMode()) {
      const prisma = getPrisma();
      const [products, balances] = await Promise.all([
        this.listDatabaseProducts(context),
        prisma.$queryRawUnsafe<{ productId: string; total: number }[]>(
          `SELECT "productId", SUM("onHand")::int as total
           FROM "StockBalance"
           WHERE "organizationId" = $1
           GROUP BY "productId"`,
          context.organization.id,
        ),
      ]);

      const balanceMap = new Map(
        balances.map((b) => [b.productId, Number(b.total)]),
      );

      return products.map((product) => ({
        ...product,
        totalOnHand: balanceMap.get(product.id) ?? 0,
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

      return suppliers.map((supplier: any) => ({
        id: supplier.id,
        organizationId: supplier.organizationId,
        name: supplier.name,
        contactName: supplier.contactName ?? undefined,
        email: supplier.email ?? undefined,
        phone: supplier.phone ?? undefined,
        leadTimeDays: supplier.leadTimeDays,
        productIds: supplier.products.map((item: any) => item.productId),
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
        return await prisma.$transaction(async (tx: any) => {
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
        return await prisma.$transaction(async (tx: any) => {
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

  async listStockRows(
    context: AuthContext,
    filters?: { cursor?: string; limit?: number },
  ) {
    if (dbMode()) {
      const result = await this.listDatabaseStockRows(context, filters);
      // Flatten for backward compatibility if no explicit pagination is requested, or just always flatten if the controller expects array
      // Wait, the API spec says `arrayOf(stockRowSchema)`, so we MUST return an array.
      return result.data;
    }

    return this.listDemoStockRows(context);
  }

  async listCriticalStockRows(context: AuthContext) {
    if (dbMode()) {
      const prisma = getPrisma();
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT sb."id", sb."productId", sb."warehouseId", sb."onHand", sb."reserved", sb."available",
                p."id" as p_id, p."organizationId" as p_orgId, p."sku", p."name" as p_name,
                p."barcode", p."category", p."description", p."minimumStock", p."isActive",
                p."unitPrice",
                w."id" as w_id, w."organizationId" as w_orgId, w."code" as w_code,
                w."name" as w_name, w."isDefault"
         FROM "StockBalance" sb
         JOIN "Product" p ON p."id" = sb."productId"
         JOIN "Warehouse" w ON w."id" = sb."warehouseId"
         WHERE sb."organizationId" = $1
           AND p."isActive" = true
           AND sb."onHand" <= p."minimumStock"
         ORDER BY sb."onHand" ASC`,
        context.organization.id,
      );

      return rows.map(mapBalanceToStockRow);
    }

    const allRows = this.listDemoStockRows(context);
    return allRows.filter((row) => row.isCritical);
  }

  async listStockMovements(
    context: AuthContext,
    filters?: { cursor?: string; limit?: number },
  ) {
    if (dbMode()) {
      const prisma = getPrisma();
      const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
      const where: Record<string, unknown> = {
        organizationId: context.organization.id,
      };

      const cursorArgs = filters?.cursor
        ? { skip: 1, cursor: { id: filters.cursor } }
        : {};

      const [total, movements] = await Promise.all([
        prisma.stockMovement.count({ where }),
        prisma.stockMovement.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          ...cursorArgs,
        } as any),
      ]);

      const hasMore = movements.length === limit;
      const lastItem = movements[movements.length - 1];

      return {
        data: movements.map(mapStockMovement),
        pagination: {
          total,
          limit,
          cursor: hasMore && lastItem ? (lastItem as any).id : null,
          hasMore,
        },
      };
    }

    const allMovements = demoState()
      .stockMovements.filter(
        (movement) => movement.organizationId === context.organization.id,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      data: allMovements,
      pagination: { total: allMovements.length, limit: allMovements.length, cursor: null, hasMore: false },
    };
  }

  async createStockMovement(input: unknown, context: AuthContext) {
    const parsed = parseInput(stockMovementInputSchema, input);
    await this.ensureProductExists(parsed.productId, context);
    await this.ensureWarehouseExists(parsed.warehouseId, context);

    const quantityChange =
      parsed.type === "OUTBOUND" ? -parsed.quantity : parsed.quantity;

    if (dbMode()) {
      const prisma = getPrisma();
      const movement = await prisma.$transaction(async (tx: any) => {
        // Lock balance row and check availability for outbound
        if (quantityChange < 0) {
          const bal = await adjustBalance(
            tx,
            context.organization.id,
            parsed.productId,
            parsed.warehouseId,
            0, // probe only — will adjust after check
          );
          if (bal.available < parsed.quantity) {
            throw new BadRequestException(
              `Insufficient stock: ${parsed.productId}: requested ${parsed.quantity}, available ${bal.available}`,
            );
          }
        }

        const mov = await tx.stockMovement.create({
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

        await adjustBalance(
          tx,
          context.organization.id,
          parsed.productId,
          parsed.warehouseId,
          quantityChange,
        );

        return mov;
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

    if (quantityChange < 0) {
      const result = await this.listStockMovements(context);
      assertEnoughStockForApi(result.data, parsed.warehouseId, [
        { productId: parsed.productId, quantity: parsed.quantity },
      ]);
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

      await prisma.$transaction(async (tx: any) => {
        // Lock source balance and check availability
        const sourceBal = await adjustBalance(
          tx,
          context.organization.id,
          parsed.productId,
          parsed.sourceWarehouseId,
          0,
        );
        if (sourceBal.available < parsed.quantity) {
          throw new BadRequestException(
            `Insufficient stock: ${parsed.productId}: requested ${parsed.quantity}, available ${sourceBal.available}`,
          );
        }

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

        // Update both balances atomically
        await adjustBalance(
          tx,
          context.organization.id,
          parsed.productId,
          parsed.sourceWarehouseId,
          -parsed.quantity,
        );
        await adjustBalance(
          tx,
          context.organization.id,
          parsed.productId,
          parsed.destinationWarehouseId,
          parsed.quantity,
        );
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

    const sourceMovements = state.stockMovements.filter(
      (movement) =>
        movement.productId === parsed.productId &&
        movement.warehouseId === parsed.sourceWarehouseId,
    );
    assertEnoughStockForApi(sourceMovements, parsed.sourceWarehouseId, [
      { productId: parsed.productId, quantity: parsed.quantity },
    ]);

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

  async listSalesOrders(
    context: AuthContext,
    filters?: { cursor?: string; limit?: number },
  ) {
    if (dbMode()) {
      const prisma = getPrisma();
      const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
      const where = { organizationId: context.organization.id };

      const cursorArgs = filters?.cursor
        ? { skip: 1, cursor: { id: filters.cursor } }
        : {};

      const [total, orders] = await Promise.all([
        prisma.salesOrder.count({ where }),
        prisma.salesOrder.findMany({
          where,
          include: { lines: true },
          orderBy: { createdAt: "desc" },
          take: limit,
          ...cursorArgs,
        } as any),
      ]);

      const hasMore = orders.length === limit;
      const lastItem = orders[orders.length - 1];

      return {
        data: orders.map((order: any) => ({
          id: order.id,
          organizationId: order.organizationId,
          code: order.code,
          customerName: order.customerName,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          lines: order.lines.map((line: any) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        })),
        pagination: {
          total,
          limit,
          cursor: hasMore && lastItem ? (lastItem as any).id : null,
          hasMore,
        },
      };
    }

    const allOrders = demoState().salesOrders.filter(
      (order) => order.organizationId === context.organization.id,
    );
    return {
      data: allOrders,
      pagination: { total: allOrders.length, limit: allOrders.length, cursor: null, hasMore: false },
    };
  }

  async listOpenSalesOrders(context: AuthContext) {
    const result = await this.listSalesOrders(context);
    return getOpenSalesOrders(result.data);
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
      return (await this.listSalesOrders(context)).data.find((item) => item.id === order.id);
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
      await prisma.$transaction(async (tx: any) => {
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

        // Check availability via StockBalance with row lock
        for (const line of order.lines) {
          const bal = await adjustBalance(
            tx,
            context.organization.id,
            line.productId,
            warehouse.id,
            0, // probe
          );
          if (bal.available < line.quantity) {
            throw new BadRequestException(
              `Insufficient stock: ${line.productId}: requested ${line.quantity}, available ${bal.available}`,
            );
          }
        }

        await tx.salesOrder.update({
          where: { id: order.id },
          data: { status: "CONFIRMED" },
        });

        // Create stock movements + update balances + create reservations
        await tx.stockMovement.createMany({
          data: order.lines.map((line: any) => ({
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

        for (const line of order.lines) {
          await adjustBalance(
            tx,
            context.organization.id,
            line.productId,
            warehouse.id,
            -line.quantity,
          );
        }

        // Create reservations
        await tx.stockReservation.createMany({
          data: order.lines.map((line: any) => ({
            organizationId: context.organization.id,
            salesOrderId: order.id,
            productId: line.productId,
            warehouseId: warehouse.id,
            quantity: line.quantity,
          })),
        });

        for (const line of order.lines) {
          await adjustReservation(
            tx,
            context.organization.id,
            line.productId,
            warehouse.id,
            line.quantity,
          );
        }
      });

      await this.audit(context, "CONFIRM", "SalesOrder", orderId, orderId);
      return (await this.listSalesOrders(context)).data.find((order) => order.id === orderId);
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

  async listPurchaseOrders(
    context: AuthContext,
    filters?: { cursor?: string; limit?: number },
  ) {
    if (dbMode()) {
      const prisma = getPrisma();
      const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
      const where = { organizationId: context.organization.id };

      const cursorArgs = filters?.cursor
        ? { skip: 1, cursor: { id: filters.cursor } }
        : {};

      const [total, orders] = await Promise.all([
        prisma.purchaseOrder.count({ where }),
        prisma.purchaseOrder.findMany({
          where,
          include: { lines: true },
          orderBy: { createdAt: "desc" },
          take: limit,
          ...cursorArgs,
        } as any),
      ]);

      const hasMore = orders.length === limit;
      const lastItem = orders[orders.length - 1];

      return {
        data: orders.map((order: any) => ({
          id: order.id,
          organizationId: order.organizationId,
          supplierId: order.supplierId,
          code: order.code,
          status: order.status,
          expectedDate: order.expectedDate?.toISOString(),
          createdAt: order.createdAt.toISOString(),
          lines: order.lines.map((line: any) => ({
            productId: line.productId,
            quantity: line.quantity,
            receivedQuantity: line.receivedQuantity,
          })),
        })),
        pagination: {
          total,
          limit,
          cursor: hasMore && lastItem ? (lastItem as any).id : null,
          hasMore,
        },
      };
    }

    const allOrders = demoState().purchaseOrders.filter(
      (order) => order.organizationId === context.organization.id,
    );
    return {
      data: allOrders,
      pagination: { total: allOrders.length, limit: allOrders.length, cursor: null, hasMore: false },
    };
  }

  async listOpenPurchaseOrders(context: AuthContext) {
    const result = await this.listPurchaseOrders(context);
    return getOpenPurchaseOrders(result.data);
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
      return (await this.listPurchaseOrders(context)).data.find(
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
      await prisma.$transaction(async (tx: any) => {
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
          .map((line: any) => ({
            productId: line.productId,
            quantity: line.quantity,
            receivedQuantity: line.receivedQuantity,
          }))
          .filter((line: any) => line.quantity > line.receivedQuantity);

        await Promise.all(
          order.lines.map((line: any) =>
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

        // Update stock balances
        for (const line of receipts) {
          const delta = line.quantity - line.receivedQuantity;
          await adjustBalance(
            tx,
            context.organization.id,
            line.productId,
            warehouse.id,
            delta,
          );
        }

        await tx.purchaseOrder.update({
          where: { id: order.id },
          data: { status: "COMPLETED" },
        });
      });

      await this.audit(context, "RECEIVE", "PurchaseOrder", orderId, orderId);
      return (await this.listPurchaseOrders(context)).data.find(
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
      const prisma = getPrisma();
      const limit = Math.min(Math.max(parseInt(query?.limit, 10) || 50, 1), 200);
      const where = { organizationId: context.organization.id };

      const cursorArgs = query?.cursor
        ? { skip: 1, cursor: { id: query.cursor } }
        : {};

      const [total, customers] = await Promise.all([
        prisma.customer.count({ where }),
        prisma.customer.findMany({
          where,
          orderBy: { name: "asc" },
          take: limit,
          ...cursorArgs,
        } as any),
      ]);

      const hasMore = customers.length === limit;
      const lastItem = customers[customers.length - 1];

      const data = customers.map((c: any) => ({
        ...c,
        email: c.email ?? undefined,
        phone: c.phone ?? undefined,
        taxId: c.taxId ?? undefined,
        address: c.address ?? undefined,
        createdAt: c.createdAt.toISOString(),
      }));

      if (!query) return data; // backward compat: no query = flat array
      return {
        data,
        pagination: {
          total,
          limit,
          cursor: hasMore && lastItem ? (lastItem as any).id : null,
          hasMore,
        },
      };
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
      const prisma = getPrisma();
      const limit = Math.min(Math.max(parseInt(query?.limit, 10) || 50, 1), 200);
      const where = { organizationId: context.organization.id };

      const cursorArgs = query?.cursor
        ? { skip: 1, cursor: { id: query.cursor } }
        : {};

      const [total, invoices] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.findMany({
          where,
          include: { lines: true },
          orderBy: { createdAt: "desc" },
          take: limit,
          ...cursorArgs,
        } as any),
      ]);

      const hasMore = invoices.length === limit;
      const lastItem = invoices[invoices.length - 1];

      const data = invoices.map((inv: any) => ({
        ...inv,
        subtotal: Number(inv.subtotal),
        discountAmount: Number(inv.discountAmount),
        taxRate: Number(inv.taxRate),
        taxAmount: Number(inv.taxAmount),
        total: Number(inv.total),
        lines: inv.lines.map((l: any) => ({
          ...l,
          unitPrice: Number(l.unitPrice),
          discount: Number(l.discount),
          lineTotal: Number(l.lineTotal),
        })),
        createdAt: inv.createdAt.toISOString(),
      }));

      if (!query) return data;
      return {
        data,
        pagination: {
          total,
          limit,
          cursor: hasMore && lastItem ? (lastItem as any).id : null,
          hasMore,
        },
      };
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
        lines: invoice.lines.map((l: any) => ({
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

    return variants.map((variant: any) => ({
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

    return returns.map((salesReturn: any) => ({
      id: salesReturn.id,
      organizationId: salesReturn.organizationId,
      salesOrderId: salesReturn.salesOrderId,
      code: salesReturn.code,
      reason: salesReturn.reason ?? undefined,
      status: salesReturn.status,
      createdAt: salesReturn.createdAt.toISOString(),
      lines: salesReturn.lines.map((line: any) => ({
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
        (ol: any) => ol.productId === line.productId,
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

    const created = await prisma.$transaction(async (tx: any) => {
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
      lines: created.lines.map((line: any) => ({
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

    await prisma.$transaction(async (tx: any) => {
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
        data: salesReturn.lines.map((line: any) => ({
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

      // Update stock balances
      for (const line of salesReturn.lines) {
        await adjustBalance(
          tx,
          context.organization.id,
          line.productId,
          warehouse.id,
          line.quantity,
        );
      }

      await Promise.all(
        salesReturn.lines.map((line: any) =>
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

  // ---------------------------------------------------------------------------
  // Pick / Pack / Ship  (Phase 3)
  // ---------------------------------------------------------------------------

  async startPicking(orderId: string, context: AuthContext) {
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.findFirst({
        where: {
          id: orderId,
          organizationId: context.organization.id,
          status: "CONFIRMED",
        },
        include: { lines: true },
      });

      if (!order) {
        throw new NotFoundException(
          "Sales order not found or not in CONFIRMED status.",
        );
      }

      const warehouse = await tx.warehouse.findFirst({
        where: { organizationId: context.organization.id, isDefault: true },
      });

      if (!warehouse) {
        throw new NotFoundException("Default warehouse not found.");
      }

      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: "PICKING" },
      });

      const pickListItemsToCreate: any[] = [];

      for (const line of order.lines) {
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        let remainingQty = line.quantity;

        const layers = await tx.inventoryLayer.findMany({
          where: {
            productId: line.productId,
            warehouseId: warehouse.id,
            quantity: { gt: 0 },
            organizationId: context.organization.id,
          },
          orderBy: product?.isBatchTracked ? { expiryDate: "asc" } : { receivedAt: "asc" },
        });

        for (const layer of layers) {
          if (remainingQty <= 0) break;
          const qtyToTake = Math.min(layer.quantity, remainingQty);

          pickListItemsToCreate.push({
            salesOrderId: order.id,
            productId: line.productId,
            quantity: qtyToTake,
            pickedQty: 0,
            binId: layer.binId,
            lotNumber: layer.lotNumber,
            serialNumber: layer.serialNumber,
            expiryDate: layer.expiryDate,
          });
          remainingQty -= qtyToTake;
        }

        if (remainingQty > 0) {
          pickListItemsToCreate.push({
            salesOrderId: order.id,
            productId: line.productId,
            quantity: remainingQty,
            pickedQty: 0,
          });
        }
      }

      const pickList = await tx.pickList.create({
        data: {
          organizationId: context.organization.id,
          warehouseId: warehouse.id,
          status: "PENDING",
          priority: 0,
          items: {
            create: pickListItemsToCreate,
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
          summary: `${order.code} → PICKING, PickList ${pickList.id}`,
        },
      });

      return { orderId: order.id, pickListId: pickList.id };
    });
  }

  async listPickLists(
    context: AuthContext,
    filters: { status?: string; assignedTo?: string; cursor?: string; limit?: number },
  ) {
    const prisma = getPrisma();
    const orgId = context.organization.id;
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);

    const where: Record<string, unknown> = { organizationId: orgId };
    if (filters.status) where.status = filters.status;
    if (filters.assignedTo) where.assignedToId = filters.assignedTo;

    const cursorArgs = filters.cursor
      ? { skip: 1, cursor: { id: filters.cursor } }
      : {};

    const [total, pickLists] = await Promise.all([
      prisma.pickList.count({ where }),
      prisma.pickList.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        ...cursorArgs,
      } as any),
    ]);

    const hasMore = pickLists.length === limit;
    const lastItem = pickLists[pickLists.length - 1];

    return {
      data: pickLists.map((pl: any) => ({
        id: pl.id,
        organizationId: pl.organizationId,
        warehouseId: pl.warehouseId,
        assignedToId: pl.assignedToId,
        status: pl.status,
        priority: pl.priority,
        startedAt: pl.startedAt?.toISOString() ?? null,
        completedAt: pl.completedAt?.toISOString() ?? null,
        createdAt: pl.createdAt.toISOString(),
        itemCount: pl.items.length,
      })),
      pagination: {
        total,
        limit,
        cursor: hasMore && lastItem ? lastItem.id : null,
        hasMore,
      },
    };
  }

  async getPickList(pickListId: string, context: AuthContext) {
    const prisma = getPrisma();

    const pickList = await prisma.pickList.findFirst({
      where: {
        id: pickListId,
        organizationId: context.organization.id,
      },
      include: { items: true },
    });

    if (!pickList) {
      throw new NotFoundException("Pick list not found.");
    }

    const total = pickList.items.reduce((sum: any, item: any) => sum + item.quantity, 0);
    const picked = pickList.items.reduce((sum: any, item: any) => sum + item.pickedQty, 0);
    const percentComplete = total === 0 ? 0 : Math.round((picked / total) * 100);

    return {
      id: pickList.id,
      organizationId: pickList.organizationId,
      warehouseId: pickList.warehouseId,
      assignedToId: pickList.assignedToId,
      status: pickList.status,
      priority: pickList.priority,
      startedAt: pickList.startedAt?.toISOString() ?? null,
      completedAt: pickList.completedAt?.toISOString() ?? null,
      createdAt: pickList.createdAt.toISOString(),
      items: pickList.items.map((item: any) => ({
        id: item.id,
        pickListId: item.pickListId,
        salesOrderId: item.salesOrderId,
        productId: item.productId,
        quantity: item.quantity,
        pickedQty: item.pickedQty,
        binLocation: item.binLocation,
        notes: item.notes,
      })),
      progress: { total, picked, percentComplete },
    };
  }

  async updatePickListItem(
    pickListId: string,
    itemId: string,
    pickedQty: number,
    context: AuthContext,
  ) {
    const prisma = getPrisma();

    const pickList = await prisma.pickList.findFirst({
      where: {
        id: pickListId,
        organizationId: context.organization.id,
      },
      include: { items: true },
    });

    if (!pickList) {
      throw new NotFoundException("Pick list not found.");
    }

    const item = pickList.items.find((i: any) => i.id === itemId);
    if (!item) {
      throw new NotFoundException("Pick list item not found.");
    }

    if (pickedQty < 0 || pickedQty > item.quantity) {
      throw new BadRequestException(
        `pickedQty must be between 0 and ${item.quantity}.`,
      );
    }

    await prisma.pickListItem.update({
      where: { id: itemId },
      data: { pickedQty },
    });

    // Recalculate progress after update
    const allItems = pickList.items.map((i: any) =>
      i.id === itemId ? { ...i, pickedQty } : i,
    );
    const total = allItems.reduce((sum: any, i: any) => sum + i.quantity, 0);
    const picked = allItems.reduce((sum: any, i: any) => sum + i.pickedQty, 0);
    const percentComplete = total === 0 ? 0 : Math.round((picked / total) * 100);

    // Auto-update pick list status
    if (pickList.status === "PENDING" && pickedQty > 0) {
      await prisma.pickList.update({
        where: { id: pickListId },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
      });
    }

    // Update SalesOrderLine and SalesOrder status
    const allItemsForProduct = pickList.items.filter((i: any) => i.productId === item.productId);
    const sumPickedForProduct = allItemsForProduct.reduce((acc: number, i: any) => i.id === itemId ? acc + pickedQty : acc + i.pickedQty, 0);

    const sol = await prisma.salesOrderLine.findFirst({
      where: { salesOrderId: item.salesOrderId, productId: item.productId }
    });
    if (sol) {
      await prisma.salesOrderLine.update({
        where: { id: sol.id },
        data: { pickedQty: sumPickedForProduct }
      });
    }

    const order = await prisma.salesOrder.findUnique({
      where: { id: item.salesOrderId },
      include: { lines: true }
    });
    if (order) {
      const totalOrdered = order.lines.reduce((acc: number, l: any) => acc + l.quantity, 0);
      // Re-sum all pickedQty across all pickListItems for this order
      const allOrderPickItems = await prisma.pickListItem.findMany({ where: { salesOrderId: order.id } });
      const totalPicked = allOrderPickItems.reduce((acc: number, p: any) => p.id === itemId ? acc + pickedQty : acc + p.pickedQty, 0);

      let newStatus = order.status;
      if (totalPicked >= totalOrdered) newStatus = "PICKED";
      else if (totalPicked > 0) newStatus = "PARTIALLY_PICKED";

      if (newStatus !== order.status) {
        await prisma.salesOrder.update({
          where: { id: order.id },
          data: { status: newStatus as any }
        });
      }
    }

    return {
      itemId,
      pickedQty,
      progress: { total, picked, percentComplete },
    };
  }

  async packOrder(orderId: string, context: AuthContext) {
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.findFirst({
        where: {
          id: orderId,
          organizationId: context.organization.id,
          status: { in: ["PICKING", "PARTIALLY_PICKED", "PICKED"] },
        },
        include: { lines: true }
      });

      if (!order) {
        throw new NotFoundException(
          "Sales order not found or not in a pickable status.",
        );
      }

      const pickLists = await tx.pickList.findMany({
        where: { organizationId: context.organization.id },
        include: {
          items: { where: { salesOrderId: orderId } },
        },
      });

      const allItems = pickLists.flatMap((pl: any) => pl.items);
      const totalQuantity = order.lines.reduce((sum: number, l: any) => sum + l.quantity, 0);
      let totalPacked = 0;

      for (const line of order.lines) {
        const lineItems = allItems.filter((i: any) => i.productId === line.productId);
        const pickedForLine = lineItems.reduce((sum: number, i: any) => sum + i.pickedQty, 0);
        await tx.salesOrderLine.update({
          where: { id: line.id },
          data: { packedQty: pickedForLine }
        });
        totalPacked += pickedForLine;
      }

      const newStatus = totalPacked >= totalQuantity ? "PACKED" : "PARTIALLY_PACKED";

      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: newStatus as any },
      });

      // Complete related pick lists
      await tx.pickList.updateMany({
        where: {
          organizationId: context.organization.id,
          items: { some: { salesOrderId: orderId } },
          status: { not: "CANCELLED" },
        },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          actorId: context.user.id,
          action: "PACK",
          entityType: "SalesOrder",
          entityId: order.id,
          summary: `${order.code} → ${newStatus}`,
        },
      });

      return { orderId: order.id, status: newStatus };
    });
  }

  async shipOrder(
    orderId: string,
    body: { carrier?: string; trackingNumber?: string; weight?: number; packageCount?: number },
    context: AuthContext,
  ) {
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.findFirst({
        where: {
          id: orderId,
          organizationId: context.organization.id,
          status: { in: ["PACKED", "PARTIALLY_PACKED", "PARTIALLY_SHIPPED"] },
        },
        include: { lines: true }
      });

      if (!order) {
        throw new NotFoundException(
          "Sales order not found or not in a shippable status.",
        );
      }

      const existingShipments = await tx.shipment.findMany({
        where: { organizationId: context.organization.id },
        select: { code: true },
      });
      const existingCodes = existingShipments.map((s: any) => s.code);

      const usedNumbers = new Set(
        existingCodes
          .map((code: any) => {
            const match = code.match(/^SHP-(\d+)$/);
            return match ? parseInt(match[1], 10) : NaN;
          })
          .filter((n: any) => !Number.isNaN(n)),
      );
      let next = 1;
      while (usedNumbers.has(next)) next++;
      const shipmentCode = `SHP-${String(next).padStart(4, "0")}`;

      let trackingUrl: string | null = null;
      if (body.carrier && body.trackingNumber) {
        const carrierUrls: Record<string, string> = {
          yurtici: "https://www.yurticikargo.com/tr/online-islemler/gonderi-sorgula?code={tracking}",
          aras: "https://kargotakip.araskargo.com.tr/..?barcode={tracking}",
          mng: "https://www.mngkargo.com.tr/..?id={tracking}",
          ptt: "https://gonderitakip.ptt.gov.tr/Track/Verify?q={tracking}",
        };
        const template = carrierUrls[body.carrier.toLowerCase()];
        if (template) {
          trackingUrl = template.replace(
            "{tracking}",
            encodeURIComponent(body.trackingNumber),
          );
        }
      }

      const totalQuantity = order.lines.reduce((sum: number, l: any) => sum + l.quantity, 0);
      let totalShipped = 0;

      for (const line of order.lines) {
        const toShip = line.packedQty - line.shippedQty;
        if (toShip > 0) {
          await tx.salesOrderLine.update({
            where: { id: line.id },
            data: { shippedQty: line.shippedQty + toShip }
          });

          // Release reservation for the shipped quantity
          const res = await tx.stockReservation.findFirst({
            where: { organizationId: context.organization.id, salesOrderId: order.id, productId: line.productId }
          });
          if (res && res.quantity > 0) {
            const releaseQty = Math.min(res.quantity, toShip);
            await adjustReservation(tx, context.organization.id, res.productId, res.warehouseId, -releaseQty);
            if (res.quantity - releaseQty <= 0) {
               await tx.stockReservation.delete({ where: { id: res.id } });
            } else {
               await tx.stockReservation.update({ where: { id: res.id }, data: { quantity: res.quantity - releaseQty } });
            }
          }
        }
        totalShipped += line.shippedQty + Math.max(0, toShip);
      }

      const newStatus = totalShipped >= totalQuantity ? "SHIPPED" : "PARTIALLY_SHIPPED";

      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: newStatus as any },
      });

      const shipment = await tx.shipment.create({
        data: {
          organizationId: context.organization.id,
          salesOrderId: order.id,
          code: shipmentCode,
          carrier: body.carrier || null,
          trackingNumber: body.trackingNumber || null,
          trackingUrl,
          weight: body.weight ?? null,
          packageCount: body.packageCount ?? 1,
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
          summary: `${order.code} → ${newStatus}, Shipment ${shipment.code}`,
        },
      });

      return {
        orderId: order.id,
        status: newStatus,
        shipment: {
          id: shipment.id,
          code: shipment.code,
          carrier: shipment.carrier,
          trackingNumber: shipment.trackingNumber,
          trackingUrl: shipment.trackingUrl,
          weight: shipment.weight ? Number(shipment.weight) : null,
          packageCount: shipment.packageCount,
          status: shipment.status,
          shippedAt: shipment.shippedAt?.toISOString() ?? null,
        },
      };
    });
  }

  async deliverOrder(orderId: string, context: AuthContext) {
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.findFirst({
        where: {
          id: orderId,
          organizationId: context.organization.id,
          status: "SHIPPED",
        },
      });

      if (!order) {
        throw new NotFoundException(
          "Sales order not found or not in SHIPPED status.",
        );
      }

      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: "DELIVERED" },
      });

      // Mark shipments as delivered
      await tx.shipment.updateMany({
        where: {
          salesOrderId: order.id,
          organizationId: context.organization.id,
          status: "IN_TRANSIT",
        },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          actorId: context.user.id,
          action: "CONFIRM",
          entityType: "SalesOrder",
          entityId: order.id,
          summary: `${order.code} → DELIVERED`,
        },
      });

      return { orderId: order.id, status: "DELIVERED" as const };
    });
  }

  // ---------------------------------------------------------------------------
  // Cycle Counts / Stocktake (Phase 9)
  // ---------------------------------------------------------------------------

  async createStocktake(warehouseId: string, assignedToId: string | null, context: AuthContext) {
    const prisma = getPrisma();
    const count = await prisma.stocktake.create({
      data: {
        organizationId: context.organization.id,
        warehouseId,
        assignedToId,
        status: "DRAFT",
      },
    });

    await this.audit(context, "CREATE", "Stocktake", count.id, "Created cycle count");
    return count;
  }

  async addStocktakeItem(stocktakeId: string, productId: string, binId: string | null, expectedQty: number, context: AuthContext) {
    const prisma = getPrisma();
    return await prisma.stocktakeItem.create({
      data: {
        stocktakeId,
        productId,
        binId,
        expectedQty,
        status: "PENDING",
      },
    });
  }

  async submitStocktakeCount(stocktakeId: string, itemId: string, countedQty: number, context: AuthContext) {
    const prisma = getPrisma();
    const item = await prisma.stocktakeItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException("Item not found.");
    
    return await prisma.stocktakeItem.update({
      where: { id: itemId },
      data: {
        countedQty,
        variance: countedQty - item.expectedQty,
        status: "COUNTED",
      },
    });
  }

  async completeStocktake(stocktakeId: string, context: AuthContext) {
    const prisma = getPrisma();
    return await prisma.stocktake.update({
      where: { id: stocktakeId },
      data: { status: "REVIEW", completedAt: new Date() },
    });
  }

  async approveStocktakeVariance(stocktakeId: string, context: AuthContext) {
    const prisma = getPrisma();
    return await prisma.$transaction(async (tx: any) => {
      const stocktake = await tx.stocktake.findUnique({
        where: { id: stocktakeId },
        include: { items: true },
      });

      if (!stocktake) throw new NotFoundException("Stocktake not found.");

      for (const item of stocktake.items) {
        if (item.variance !== null && item.variance !== 0 && item.status !== "REJECTED") {
          await tx.stocktakeItem.update({ where: { id: item.id }, data: { status: "APPROVED" } });
          
          await tx.stockMovement.create({
            data: {
              organizationId: context.organization.id,
              warehouseId: stocktake.warehouseId,
              productId: item.productId,
              binId: item.binId,
              type: "ADJUSTMENT",
              quantityChange: item.variance,
              note: "Cycle count variance approved",
              createdById: context.user.id,
            },
          });
          
          await adjustBalance(
            tx,
            context.organization.id,
            item.productId,
            stocktake.warehouseId,
            item.variance,
          );
        }
      }

      const updated = await tx.stocktake.update({
        where: { id: stocktakeId },
        data: { status: "COMPLETED" },
      });
      await this.audit(context, "STOCKTAKE", "Stocktake", stocktake.id, "Approved variance");
      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // Stock Reconciliation (Phase 8)
  // ---------------------------------------------------------------------------

  async runReconciliation(context: AuthContext, autoFix = false) {
    if (!dbMode()) {
      throw new BadRequestException("Reconciliation requires database mode.");
    }

    const prisma = getPrisma();
    const orgId = context.organization.id;

    // Compare ledger sums vs StockBalance
    const ledgerSums = await prisma.$queryRawUnsafe<
      { productId: string; warehouseId: string; ledger_total: number }[]
    >(
      `SELECT "productId", "warehouseId", SUM("quantityChange")::int as ledger_total
       FROM "StockMovement"
       WHERE "organizationId" = $1
       GROUP BY "productId", "warehouseId"`,
      orgId,
    );

    const balances = await prisma.$queryRawUnsafe<
      { productId: string; warehouseId: string; onHand: number; id: string }[]
    >(
      `SELECT "id", "productId", "warehouseId", "onHand"
       FROM "StockBalance"
       WHERE "organizationId" = $1`,
      orgId,
    );

    const balanceMap = new Map(
      balances.map((b) => [`${b.productId}:${b.warehouseId}`, b]),
    );
    const ledgerMap = new Map(
      ledgerSums.map((l) => [`${l.productId}:${l.warehouseId}`, Number(l.ledger_total)]),
    );

    // Find all unique keys across both
    const allKeys = new Set([...balanceMap.keys(), ...ledgerMap.keys()]);
    const mismatches: {
      productId: string;
      warehouseId: string;
      ledgerTotal: number;
      balanceOnHand: number;
      delta: number;
      fixed: boolean;
    }[] = [];

    for (const key of allKeys) {
      const [productId, warehouseId] = key.split(":");
      const ledgerTotal = ledgerMap.get(key) ?? 0;
      const balance = balanceMap.get(key);
      const balanceOnHand = balance ? Number(balance.onHand) : 0;

      if (ledgerTotal !== balanceOnHand) {
        const delta = ledgerTotal - balanceOnHand;
        let fixed = false;

        if (autoFix && balance) {
          await prisma.$executeRawUnsafe(
            `UPDATE "StockBalance"
             SET "onHand" = $1, "available" = $1 - "reserved", "version" = "version" + 1, "updatedAt" = NOW()
             WHERE "id" = $2`,
            ledgerTotal,
            balance.id,
          );
          fixed = true;
        } else if (autoFix && !balance) {
          // Balance row missing — create it
          await prisma.$executeRawUnsafe(
            `INSERT INTO "StockBalance" ("id", "organizationId", "productId", "warehouseId", "onHand", "reserved", "available", "version", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, $4, 0, NOW())
             ON CONFLICT ("organizationId", "productId", "warehouseId")
             DO UPDATE SET "onHand" = $4, "available" = $4 - "StockBalance"."reserved", "version" = "StockBalance"."version" + 1, "updatedAt" = NOW()`,
            orgId,
            productId,
            warehouseId,
            ledgerTotal,
          );
          fixed = true;
        }

        mismatches.push({
          productId,
          warehouseId,
          ledgerTotal,
          balanceOnHand,
          delta,
          fixed,
        });
      }
    }

    // Store reconciliation record
    const recon = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "StockReconciliation" ("id", "organizationId", "status", "totalChecked", "mismatchCount", "autoFixed", "details", "createdById", "createdAt")
       VALUES (gen_random_uuid(), $1, 'COMPLETED', $2, $3, $4, $5::jsonb, $6, NOW())
       RETURNING *`,
      orgId,
      allKeys.size,
      mismatches.length,
      mismatches.filter((m) => m.fixed).length,
      JSON.stringify(mismatches),
      context.user.id,
    );

    await this.audit(context, "STOCKTAKE", "StockReconciliation", recon[0].id, `${mismatches.length} mismatch(es)`);

    return {
      id: recon[0].id,
      totalChecked: allKeys.size,
      mismatchCount: mismatches.length,
      autoFixed: mismatches.filter((m) => m.fixed).length,
      mismatches,
    };
  }

  async listReconciliations(context: AuthContext) {
    if (!dbMode()) {
      return [];
    }

    const prisma = getPrisma();
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id", "organizationId", "status", "totalChecked", "mismatchCount", "autoFixed", "createdAt"
       FROM "StockReconciliation"
       WHERE "organizationId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 50`,
      context.organization.id,
    );

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      totalChecked: Number(r.totalChecked),
      mismatchCount: Number(r.mismatchCount),
      autoFixed: Number(r.autoFixed),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    }));
  }

  private async listDatabaseStockRows(
    context: AuthContext,
    filters?: { cursor?: string; limit?: number },
  ) {
    const prisma = getPrisma();
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);

    const cursorClause = filters?.cursor
      ? `AND sb."id" > $2`
      : "";
    const params: unknown[] = [context.organization.id];
    if (filters?.cursor) params.push(filters.cursor);

    const countResult = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int as total
       FROM "StockBalance" sb
       JOIN "Product" p ON p."id" = sb."productId"
       WHERE sb."organizationId" = $1 AND p."isActive" = true`,
      context.organization.id,
    );
    const total = countResult[0]?.total ?? 0;

    const limitParam = params.length + 1;
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT sb."id", sb."productId", sb."warehouseId", sb."onHand", sb."reserved", sb."available",
              p."id" as p_id, p."organizationId" as p_orgId, p."sku", p."name" as p_name,
              p."barcode", p."category", p."description", p."minimumStock", p."isActive",
              p."unitPrice",
              w."id" as w_id, w."organizationId" as w_orgId, w."code" as w_code,
              w."name" as w_name, w."isDefault"
       FROM "StockBalance" sb
       JOIN "Product" p ON p."id" = sb."productId"
       JOIN "Warehouse" w ON w."id" = sb."warehouseId"
       WHERE sb."organizationId" = $1 AND p."isActive" = true
       ${cursorClause}
       ORDER BY sb."id" ASC
       LIMIT $${limitParam}`,
      ...params,
      limit,
    );

    const hasMore = rows.length === limit;
    const lastItem = rows[rows.length - 1];

    return {
      data: rows.map(mapBalanceToStockRow),
      pagination: {
        total,
        limit,
        cursor: hasMore && lastItem ? lastItem.id : null,
        hasMore,
      },
    };
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
    action: "CREATE" | "UPDATE" | "CONFIRM" | "RECEIVE" | "CANCEL" | "PICK" | "PACK" | "SHIP" | "STOCKTAKE",
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
        action: action as any,
        entityType,
        entityId,
        summary,
      },
    });
  }
}
