import type { Product, StockMovement } from "@stockops/core/types";
import { getStockOnHand } from "@stockops/core/inventory";
import { PazaramaClient, PazaramaCircuitOpenError } from "./client";
import { buildPazaramaProductsMap } from "./mapper";
import type {
  PazaramaInventoryItem,
  PazaramaProduct,
  SyncError,
  SyncResult,
} from "./types";

export type InventorySyncConfig = {
  warehouseId: string;
  dryRun?: boolean;
  batchSize?: number;
};

/**
 * Push StockOps inventory levels to Pazarama.
 * Stock quantity is calculated from StockMovement records via getStockOnHand().
 */
export async function pushInventoryToPazarama(
  client: PazaramaClient,
  products: Product[],
  movements: StockMovement[],
  pazaramaProducts: PazaramaProduct[],
  config: InventorySyncConfig,
): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const errors: SyncError[] = [];
  let syncedCount = 0;
  let skippedCount = 0;

  const stockOpsMap = buildPazaramaProductsMap(products);
  const batchSize = config.batchSize ?? 100;
  const items: PazaramaInventoryItem[] = [];

  for (const pzProduct of pazaramaProducts) {
    const key = pzProduct.merchantSku;
    if (!key) {
      skippedCount++;
      continue;
    }

    const stockOpsProduct = stockOpsMap.get(key);
    if (!stockOpsProduct) {
      skippedCount++;
      continue;
    }

    const stockOpsQty = getStockOnHand(
      movements,
      stockOpsProduct.id,
      config.warehouseId,
    );

    if (pzProduct.stock === stockOpsQty) {
      skippedCount++;
      continue;
    }

    items.push({
      merchantSku: key,
      stock: stockOpsQty,
    });
  }

  if (config.dryRun) {
    return {
      success: true,
      syncedCount: items.length,
      failedCount: 0,
      skippedCount,
      errors: [],
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      await client.updateInventory(batch);
      syncedCount += batch.length;
    } catch (error) {
      const retryable = error instanceof PazaramaCircuitOpenError;
      for (const item of batch) {
        errors.push({
          sku: item.merchantSku,
          message: error instanceof Error ? error.message : String(error),
          retryable,
        });
      }
    }
  }

  return {
    success: errors.length === 0,
    syncedCount,
    failedCount: errors.length,
    skippedCount,
    errors,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Build ADJUSTMENT movements from Pazarama stock levels.
 */
export function buildPullAdjustments(
  pazaramaProducts: PazaramaProduct[],
  products: Product[],
  movements: StockMovement[],
  config: InventorySyncConfig,
  organizationId: string,
  userId: string,
): Omit<StockMovement, "id">[] {
  const adjustments: Omit<StockMovement, "id">[] = [];
  const stockOpsMap = buildPazaramaProductsMap(products);

  for (const pzProduct of pazaramaProducts) {
    const key = pzProduct.merchantSku;
    if (!key) continue;

    const stockOpsProduct = stockOpsMap.get(key);
    if (!stockOpsProduct) continue;

    const stockOpsQty = getStockOnHand(
      movements,
      stockOpsProduct.id,
      config.warehouseId,
    );

    const pzQty = pzProduct.stock;
    if (pzQty === stockOpsQty) continue;

    const difference = pzQty - stockOpsQty;

    adjustments.push({
      organizationId,
      warehouseId: config.warehouseId,
      productId: stockOpsProduct.id,
      type: "ADJUSTMENT",
      quantityChange: difference,
      reference: `PAZARAMA-SYNC-${new Date().toISOString().slice(0, 10)}`,
      note: `Pazarama stok senkronizasyonu: ${stockOpsQty} → ${pzQty}`,
      createdById: userId,
      createdAt: new Date().toISOString(),
    });
  }

  return adjustments;
}
