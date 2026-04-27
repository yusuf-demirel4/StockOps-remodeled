import type { Product, StockMovement } from "@stockops/core/types";
import { getStockOnHand } from "@stockops/core/inventory";
import { WooCommerceClient } from "./client";
import { buildProductsMap, detectWooInventoryDiscrepancies } from "./mapper";
import type { ConflictResolution, ReconciliationResult, WooProduct } from "./types";

export type ReconciliationConfig = {
  warehouseId: string;
  autoFixThreshold: number;
  conflictResolution: ConflictResolution;
  dryRun?: boolean;
};

export async function runReconciliation(
  client: WooCommerceClient,
  products: Product[],
  movements: StockMovement[],
  config: ReconciliationConfig,
): Promise<ReconciliationResult> {
  const wooProducts = await client.getProducts(100);

  const stockOpsMap = buildProductsMap(products);

  const getStockOpsQty = (sku: string): number => {
    const product = stockOpsMap.get(sku);
    if (!product) return 0;
    return getStockOnHand(movements, product.id, config.warehouseId);
  };

  const rawDiscrepancies = detectWooInventoryDiscrepancies(
    wooProducts,
    products,
    getStockOpsQty,
  );

  const discrepancies: ReconciliationResult["discrepancies"] = [];
  let autoFixedCount = 0;
  let requiresManualReview = 0;

  for (const raw of rawDiscrepancies) {
    const absDiff = Math.abs(raw.difference);
    const canAutoFix = absDiff <= config.autoFixThreshold;

    if (canAutoFix && !config.dryRun) {
      const fixed = await tryAutoFix(client, wooProducts, raw, config);

      discrepancies.push({
        ...raw,
        autoFixed: fixed,
        resolution: fixed
          ? `Otomatik düzeltildi (${config.conflictResolution})`
          : "Otomatik düzeltme başarısız",
      });

      if (fixed) autoFixedCount++;
      else requiresManualReview++;
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
  for (const wp of wooProducts) {
    if (wp.sku && stockOpsMap.has(wp.sku)) {
      matchedSkus.add(wp.sku);
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
  client: WooCommerceClient,
  wooProducts: WooProduct[],
  discrepancy: { sku: string; stockopsQuantity: number },
  config: ReconciliationConfig,
): Promise<boolean> {
  try {
    if (config.conflictResolution === "woocommerce_wins") {
      return true;
    }

    const wooProduct = wooProducts.find((wp) => wp.sku === discrepancy.sku);
    if (!wooProduct) return false;

    await client.updateProductStock(wooProduct.id, discrepancy.stockopsQuantity);
    return true;
  } catch {
    return false;
  }
}

export function formatReconciliationReport(result: ReconciliationResult): string {
  const lines = [
    `WooCommerce Stok Uzlaştırma Raporu - ${result.completedAt}`,
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
        `    WooCommerce: ${d.wooQuantity} | StockOps: ${d.stockopsQuantity} | Fark: ${d.difference > 0 ? "+" : ""}${d.difference}`,
        `    Durum: ${d.resolution ?? (d.autoFixed ? "Düzeltildi" : "Bekliyor")}`,
      );
    }
  }

  return lines.join("\n");
}
