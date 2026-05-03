import type { Product, StockMovement } from "@stockops/core/types";
import { getStockOnHand } from "@stockops/core/inventory";
import { TrendyolClient, TrendyolCircuitOpenError } from "./client";
import { buildBarcodeProductsMap } from "./mapper";
import type {
  SyncError,
  SyncResult,
  TrendyolInventoryItem,
  TrendyolProduct,
} from "./types";

export type InventorySyncConfig = {
  warehouseId: string;
  dryRun?: boolean;
  batchSize?: number;
};

/**
 * Push StockOps inventory levels to Trendyol.
 * Uses batch endpoint (price-and-inventory) for efficiency.
 * Stock quantity is calculated from StockMovement records via getStockOnHand().
 */
export async function pushInventoryToTrendyol(
  client: TrendyolClient,
  products: Product[],
  movements: StockMovement[],
  trendyolProducts: TrendyolProduct[],
  config: InventorySyncConfig,
): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const errors: SyncError[] = [];
  let syncedCount = 0;
  let skippedCount = 0;

  const stockOpsMap = buildBarcodeProductsMap(products);
  const batchSize = config.batchSize ?? 100;

  const items: TrendyolInventoryItem[] = [];

  for (const trendyolProduct of trendyolProducts) {
    const barcode = trendyolProduct.barcode;
    if (!barcode) {
      skippedCount++;
      continue;
    }

    const stockOpsProduct = stockOpsMap.get(barcode);
    if (!stockOpsProduct) {
      skippedCount++;
      continue;
    }

    const stockOpsQty = getStockOnHand(
      movements,
      stockOpsProduct.id,
      config.warehouseId,
    );

    if (trendyolProduct.quantity === stockOpsQty) {
      skippedCount++;
      continue;
    }

    items.push({
      barcode,
      quantity: stockOpsQty,
      salePrice: trendyolProduct.salePrice,
      listPrice: trendyolProduct.listPrice,
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

  // Send in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      await client.updatePriceAndInventory(batch);
      syncedCount += batch.length;
    } catch (error) {
      const retryable = error instanceof TrendyolCircuitOpenError;
      for (const item of batch) {
        errors.push({
          sku: item.barcode,
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
 * Build ADJUSTMENT movements from Trendyol stock levels into StockOps.
 */
export function buildPullAdjustments(
  trendyolProducts: TrendyolProduct[],
  products: Product[],
  movements: StockMovement[],
  config: InventorySyncConfig,
  organizationId: string,
  userId: string,
): Omit<StockMovement, "id">[] {
  const adjustments: Omit<StockMovement, "id">[] = [];
  const stockOpsMap = buildBarcodeProductsMap(products);

  for (const trendyolProduct of trendyolProducts) {
    if (!trendyolProduct.barcode) continue;

    const stockOpsProduct = stockOpsMap.get(trendyolProduct.barcode);
    if (!stockOpsProduct) continue;

    const stockOpsQty = getStockOnHand(
      movements,
      stockOpsProduct.id,
      config.warehouseId,
    );

    const trendyolQty = trendyolProduct.quantity;
    if (trendyolQty === stockOpsQty) continue;

    const difference = trendyolQty - stockOpsQty;

    adjustments.push({
      organizationId,
      warehouseId: config.warehouseId,
      productId: stockOpsProduct.id,
      type: "ADJUSTMENT",
      quantityChange: difference,
      reference: `TRENDYOL-SYNC-${new Date().toISOString().slice(0, 10)}`,
      note: `Trendyol stok senkronizasyonu: ${stockOpsQty} → ${trendyolQty}`,
      createdById: userId,
      createdAt: new Date().toISOString(),
    });
  }

  return adjustments;
}
