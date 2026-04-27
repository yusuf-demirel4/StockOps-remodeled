import type { Product, StockMovement } from "@stockops/core/types";
import { getStockOnHand } from "@stockops/core/inventory";
import { ShopifyClient } from "./client";
import { buildProductsMap, detectInventoryDiscrepancies } from "./mapper";
import type {
  ConflictResolution,
  InventoryDiscrepancy,
  ReconciliationResult,
  ShopifyProduct,
} from "./types";

export type ReconciliationConfig = {
  locationId: string;
  warehouseId: string;
  autoFixThreshold: number;
  conflictResolution: ConflictResolution;
  dryRun?: boolean;
};

/**
 * Nightly reconciliation job: full inventory comparison between Shopify and StockOps.
 * Auto-fixes small discrepancies, flags large ones for manual review.
 *
 * This is the feature Cin7 doesn't have - periodic validation ensures
 * inventory never drifts out of sync silently.
 */
export async function runReconciliation(
  client: ShopifyClient,
  products: Product[],
  movements: StockMovement[],
  config: ReconciliationConfig,
): Promise<ReconciliationResult> {
  const shopifyProducts = await client.getProducts(250);

  const stockOpsMap = buildProductsMap(products);

  const getStockOpsQty = (sku: string): number => {
    const product = stockOpsMap.get(sku);
    if (!product) return 0;
    return getStockOnHand(movements, product.id, config.warehouseId);
  };

  const rawDiscrepancies = detectInventoryDiscrepancies(
    shopifyProducts,
    products,
    getStockOpsQty,
  );

  const discrepancies: InventoryDiscrepancy[] = [];
  let autoFixedCount = 0;
  let requiresManualReview = 0;

  for (const raw of rawDiscrepancies) {
    const absDiff = Math.abs(raw.difference);
    const canAutoFix = absDiff <= config.autoFixThreshold;

    if (canAutoFix && !config.dryRun) {
      const fixed = await tryAutoFix(
        client,
        shopifyProducts,
        raw,
        config,
      );

      discrepancies.push({
        ...raw,
        autoFixed: fixed,
        resolution: fixed
          ? `Otomatik düzeltildi (${config.conflictResolution})`
          : "Otomatik düzeltme başarısız",
      });

      if (fixed) {
        autoFixedCount++;
      } else {
        requiresManualReview++;
      }
    } else {
      discrepancies.push({
        ...raw,
        autoFixed: false,
        resolution: canAutoFix
          ? "Kuru çalıştırma - düzeltilmedi"
          : "Eşik aşıldı - manuel inceleme gerekli",
      });
      requiresManualReview++;
    }
  }

  const matchedSkus = new Set<string>();
  for (const sp of shopifyProducts) {
    for (const v of sp.variants) {
      if (v.sku && stockOpsMap.has(v.sku)) {
        matchedSkus.add(v.sku);
      }
    }
  }

  return {
    totalProducts: matchedSkus.size,
    matchedCount: matchedSkus.size - rawDiscrepancies.length,
    discrepancies,
    autoFixedCount,
    requiresManualReview,
    completedAt: new Date().toISOString(),
  };
}

async function tryAutoFix(
  client: ShopifyClient,
  shopifyProducts: ShopifyProduct[],
  discrepancy: {
    sku: string;
    shopifyQuantity: number;
    stockopsQuantity: number;
  },
  config: ReconciliationConfig,
): Promise<boolean> {
  try {
    if (config.conflictResolution === "shopify_wins") {
      // StockOps will create adjustment movement upstream
      return true;
    }

    // stockops_wins or newest_wins: push to Shopify
    const variant = findVariantBySku(shopifyProducts, discrepancy.sku);
    if (!variant?.inventoryItemId) return false;

    await client.setInventoryLevel(
      variant.inventoryItemId,
      config.locationId,
      discrepancy.stockopsQuantity,
    );

    return true;
  } catch {
    return false;
  }
}

function findVariantBySku(shopifyProducts: ShopifyProduct[], sku: string) {
  for (const product of shopifyProducts) {
    for (const variant of product.variants) {
      if (variant.sku === sku) return variant;
    }
  }
  return null;
}

/**
 * Generate a human-readable reconciliation report.
 */
export function formatReconciliationReport(result: ReconciliationResult): string {
  const lines = [
    `Stok Uzlaştırma Raporu - ${result.completedAt}`,
    `${"=".repeat(50)}`,
    `Toplam eşleşen ürün: ${result.totalProducts}`,
    `Tutarlı: ${result.matchedCount}`,
    `Uyumsuzluk: ${result.discrepancies.length}`,
    `Otomatik düzeltilen: ${result.autoFixedCount}`,
    `Manuel inceleme gereken: ${result.requiresManualReview}`,
  ];

  if (result.discrepancies.length > 0) {
    lines.push("", "Uyumsuzluk Detayları:", "-".repeat(50));

    for (const d of result.discrepancies) {
      lines.push(
        `  ${d.sku} (${d.productName})`,
        `    Shopify: ${d.shopifyQuantity} | StockOps: ${d.stockopsQuantity} | Fark: ${d.difference > 0 ? "+" : ""}${d.difference}`,
        `    Durum: ${d.resolution ?? (d.autoFixed ? "Düzeltildi" : "Bekliyor")}`,
      );
    }
  }

  return lines.join("\n");
}
