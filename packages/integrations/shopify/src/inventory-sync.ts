import type { Product, StockMovement } from "@stockops/core/types";
import { getStockOnHand } from "@stockops/core/inventory";
import { ShopifyClient, ShopifyCircuitOpenError } from "./client";
import { buildProductsMap } from "./mapper";
import type {
  ConflictResolution,
  ShopifyProduct,
  SyncDirection,
  SyncError,
  SyncResult,
} from "./types";

export type InventorySyncConfig = {
  direction: SyncDirection;
  conflictResolution: ConflictResolution;
  locationId: string;
  warehouseId: string;
  dryRun?: boolean;
};

/**
 * Push StockOps inventory levels to Shopify.
 * Uses circuit breaker - if Shopify is down, errors are queued for retry.
 */
export async function pushInventoryToShopify(
  client: ShopifyClient,
  products: Product[],
  movements: StockMovement[],
  shopifyProducts: ShopifyProduct[],
  config: InventorySyncConfig,
): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const errors: SyncError[] = [];
  let syncedCount = 0;
  let skippedCount = 0;

  const stockOpsMap = buildProductsMap(products);

  for (const shopifyProduct of shopifyProducts) {
    for (const variant of shopifyProduct.variants) {
      if (!variant.sku || !variant.inventoryItemId) {
        skippedCount++;
        continue;
      }

      const stockOpsProduct = stockOpsMap.get(variant.sku);
      if (!stockOpsProduct) {
        skippedCount++;
        continue;
      }

      const stockOpsQty = getStockOnHand(
        movements,
        stockOpsProduct.id,
        config.warehouseId,
      );

      if (variant.inventoryQuantity === stockOpsQty) {
        skippedCount++;
        continue;
      }

      if (config.dryRun) {
        syncedCount++;
        continue;
      }

      try {
        await client.setInventoryLevel(
          variant.inventoryItemId,
          config.locationId,
          stockOpsQty,
        );
        syncedCount++;
      } catch (error) {
        const retryable = error instanceof ShopifyCircuitOpenError;
        errors.push({
          sku: variant.sku,
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
 * Pull Shopify inventory levels into StockOps.
 * Creates ADJUSTMENT movements for discrepancies.
 */
export function buildPullAdjustments(
  shopifyProducts: ShopifyProduct[],
  products: Product[],
  movements: StockMovement[],
  config: InventorySyncConfig,
  organizationId: string,
  userId: string,
): Omit<StockMovement, "id">[] {
  const adjustments: Omit<StockMovement, "id">[] = [];
  const stockOpsMap = buildProductsMap(products);

  for (const shopifyProduct of shopifyProducts) {
    for (const variant of shopifyProduct.variants) {
      if (!variant.sku) continue;

      const stockOpsProduct = stockOpsMap.get(variant.sku);
      if (!stockOpsProduct) continue;

      const stockOpsQty = getStockOnHand(
        movements,
        stockOpsProduct.id,
        config.warehouseId,
      );

      const shopifyQty = variant.inventoryQuantity;

      if (shopifyQty === stockOpsQty) continue;

      const difference = shopifyQty - stockOpsQty;

      adjustments.push({
        organizationId,
        warehouseId: config.warehouseId,
        productId: stockOpsProduct.id,
        type: "ADJUSTMENT",
        quantityChange: difference,
        reference: `SHOPIFY-SYNC-${new Date().toISOString().slice(0, 10)}`,
        note: `Shopify stok senkronizasyonu: ${stockOpsQty} → ${shopifyQty}`,
        createdById: userId,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return adjustments;
}

/**
 * Bidirectional sync with conflict resolution.
 * Returns adjustments needed based on conflict resolution strategy.
 */
export function resolveBidirectionalConflicts(
  shopifyProducts: ShopifyProduct[],
  products: Product[],
  movements: StockMovement[],
  config: InventorySyncConfig,
): { pushToShopify: { sku: string; quantity: number }[]; pullFromShopify: { sku: string; quantity: number }[] } {
  const pushToShopify: { sku: string; quantity: number }[] = [];
  const pullFromShopify: { sku: string; quantity: number }[] = [];
  const stockOpsMap = buildProductsMap(products);

  for (const shopifyProduct of shopifyProducts) {
    for (const variant of shopifyProduct.variants) {
      if (!variant.sku) continue;

      const stockOpsProduct = stockOpsMap.get(variant.sku);
      if (!stockOpsProduct) continue;

      const stockOpsQty = getStockOnHand(
        movements,
        stockOpsProduct.id,
        config.warehouseId,
      );
      const shopifyQty = variant.inventoryQuantity;

      if (shopifyQty === stockOpsQty) continue;

      switch (config.conflictResolution) {
        case "stockops_wins":
          pushToShopify.push({ sku: variant.sku, quantity: stockOpsQty });
          break;
        case "shopify_wins":
          pullFromShopify.push({ sku: variant.sku, quantity: shopifyQty });
          break;
        case "newest_wins":
          // Default to StockOps wins for now - timestamp comparison
          // would require tracking per-SKU update times
          pushToShopify.push({ sku: variant.sku, quantity: stockOpsQty });
          break;
      }
    }
  }

  return { pushToShopify, pullFromShopify };
}
