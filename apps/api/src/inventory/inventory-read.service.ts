import { Injectable } from "@nestjs/common";
import { createInitialState } from "@stockops/core/demo-data";
import { buildStockRows } from "@stockops/core/inventory";
import type { Product } from "@stockops/core/types";
import { getPrisma } from "@stockops/db";

type ProductListItem = Product & {
  totalOnHand: number;
};

@Injectable()
export class InventoryReadService {
  async listProducts(): Promise<ProductListItem[]> {
    if (process.env.APP_DATA_SOURCE === "database") {
      return this.listDatabaseProducts();
    }

    const state = createInitialState();
    const rows = buildStockRows(
      state.products,
      state.warehouses,
      state.stockMovements,
    );

    return state.products.map((product) => ({
      ...product,
      totalOnHand: rows
        .filter((row) => row.product.id === product.id)
        .reduce((total, row) => total + row.onHand, 0),
    }));
  }

  private async listDatabaseProducts(): Promise<ProductListItem[]> {
    const prisma = getPrisma();
    const [products, warehouses, stockMovements] = await Promise.all([
      prisma.product.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.warehouse.findMany(),
      prisma.stockMovement.findMany(),
    ]);

    const mappedProducts: Product[] = products.map((product) => ({
      id: product.id,
      organizationId: product.organizationId,
      sku: product.sku,
      name: product.name,
      barcode: product.barcode ?? undefined,
      category: product.category,
      description: product.description ?? undefined,
      minimumStock: product.minimumStock,
      isActive: product.isActive,
    }));
    const rows = buildStockRows(
      mappedProducts,
      warehouses.map((warehouse) => ({
        id: warehouse.id,
        organizationId: warehouse.organizationId,
        code: warehouse.code,
        name: warehouse.name,
        isDefault: warehouse.isDefault,
      })),
      stockMovements.map((movement) => ({
        id: movement.id,
        organizationId: movement.organizationId,
        warehouseId: movement.warehouseId,
        productId: movement.productId,
        type: movement.type,
        quantityChange: movement.quantityChange,
        reference: movement.reference ?? undefined,
        note: movement.note ?? undefined,
        createdById: movement.createdById ?? undefined,
        createdAt: movement.createdAt.toISOString(),
      })),
    );

    return mappedProducts.map((product) => ({
      ...product,
      totalOnHand: rows
        .filter((row) => row.product.id === product.id)
        .reduce((total, row) => total + row.onHand, 0),
    }));
  }
}
