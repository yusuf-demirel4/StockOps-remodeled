import type { Product, StockMovement } from "@stockops/core/types";
import { getStockOnHand } from "@stockops/core/inventory";
import { WooCommerceClient, WooCircuitOpenError } from "./client";
import { buildProductsMap } from "./mapper";
import type { ConflictResolution, SyncResult, WooProduct } from "./types";

export type InventorySyncConfig = {
  conflictResolution: ConflictResolution;
  warehouseId: string;
  dryRun?: boolean;
};

export async function pushInventoryToWooCommerce(
  client: WooCommerceClient,
  products: Product[],
  movements: StockMovement[],
  wooProducts: WooProduct[],
  config: InventorySyncConfig,
): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const errors: SyncResult["errors"] = [];
  let syncedCount = 0;
  let skippedCount = 0;

  const stockOpsMap = buildProductsMap(products);

  for (const wooProduct of wooProducts) {
    if (!wooProduct.sku || !wooProduct.manage_stock) {
      skippedCount++;
      continue;
    }

    const stockOpsProduct = stockOpsMap.get(wooProduct.sku);
    if (!stockOpsProduct) {
      skippedCount++;
      continue;
    }

    const stockOpsQty = getStockOnHand(
      movements,
      stockOpsProduct.id,
      config.warehouseId,
    );

    if (wooProduct.stock_quantity === stockOpsQty) {
      skippedCount++;
      continue;
    }

    if (config.dryRun) {
      syncedCount++;
      continue;
    }

    try {
      await client.updateProductStock(wooProduct.id, stockOpsQty);
      syncedCount++;
    } catch (error) {
      errors.push({
        sku: wooProduct.sku,
        message: error instanceof Error ? error.message : String(error),
        retryable: error instanceof WooCircuitOpenError,
      });
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

export function buildPullAdjustments(
  wooProducts: WooProduct[],
  products: Product[],
  movements: StockMovement[],
  config: InventorySyncConfig,
  organizationId: string,
  userId: string,
): Omit<StockMovement, "id">[] {
  const adjustments: Omit<StockMovement, "id">[] = [];
  const stockOpsMap = buildProductsMap(products);

  for (const wooProduct of wooProducts) {
    if (!wooProduct.sku || !wooProduct.manage_stock) continue;

    const stockOpsProduct = stockOpsMap.get(wooProduct.sku);
    if (!stockOpsProduct) continue;

    const stockOpsQty = getStockOnHand(
      movements,
      stockOpsProduct.id,
      config.warehouseId,
    );
    const wooQty = wooProduct.stock_quantity ?? 0;

    if (wooQty === stockOpsQty) continue;

    adjustments.push({
      organizationId,
      warehouseId: config.warehouseId,
      productId: stockOpsProduct.id,
      type: "ADJUSTMENT",
      quantityChange: wooQty - stockOpsQty,
      reference: `WOO-SYNC-${new Date().toISOString().slice(0, 10)}`,
      note: `WooCommerce stok senkronizasyonu: ${stockOpsQty} → ${wooQty}`,
      createdById: userId,
      createdAt: new Date().toISOString(),
    });
  }

  return adjustments;
}
