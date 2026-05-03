import type { Product, StockMovement } from "@stockops/core/types";
import { getStockOnHand } from "@stockops/core/inventory";
import { HepsiburadaClient, HepsiburadaCircuitOpenError } from "./client";
import { buildHBProductsMap } from "./mapper";
import type {
  HepsiburadaInventoryItem,
  HepsiburadaProduct,
  SyncError,
} from "./types";

export type InventorySyncConfig = {
  warehouseId: string;
  dryRun?: boolean;
};

export type InventoryUploadResult = {
  ticketId: string;
  status: "PENDING";
  itemCount: number;
  skippedCount: number;
  errors: SyncError[];
  startedAt: string;
};

/**
 * Push StockOps inventory to Hepsiburada.
 *
 * CRITICAL DIFFERENCE FROM SHOPIFY/TRENDYOL:
 * This endpoint is ASYNCHRONOUS. It returns a ticketId, not a final result.
 * The caller must save the ticketId to HepsiburadaSyncTicket table and
 * poll for completion using ticket-poller.ts.
 */
export async function pushInventoryToHepsiburada(
  client: HepsiburadaClient,
  products: Product[],
  movements: StockMovement[],
  hbProducts: HepsiburadaProduct[],
  config: InventorySyncConfig,
): Promise<InventoryUploadResult> {
  const startedAt = new Date().toISOString();
  const errors: SyncError[] = [];
  let skippedCount = 0;

  const stockOpsMap = buildHBProductsMap(products);
  const items: HepsiburadaInventoryItem[] = [];

  for (const hbProduct of hbProducts) {
    const key = hbProduct.merchantSku;
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

    if (hbProduct.availableStock === stockOpsQty) {
      skippedCount++;
      continue;
    }

    items.push({
      merchantSku: key,
      quantity: stockOpsQty,
    });
  }

  if (items.length === 0 || config.dryRun) {
    return {
      ticketId: "",
      status: "PENDING",
      itemCount: items.length,
      skippedCount,
      errors: [],
      startedAt,
    };
  }

  try {
    const response = await client.uploadInventory(items);

    return {
      ticketId: response.ticketId,
      status: "PENDING",
      itemCount: items.length,
      skippedCount,
      errors: [],
      startedAt,
    };
  } catch (error) {
    const retryable = error instanceof HepsiburadaCircuitOpenError;
    errors.push({
      sku: "BATCH",
      message: error instanceof Error ? error.message : String(error),
      retryable,
    });

    return {
      ticketId: "",
      status: "PENDING",
      itemCount: 0,
      skippedCount,
      errors,
      startedAt,
    };
  }
}

/**
 * Build ADJUSTMENT movements from Hepsiburada stock levels.
 */
export function buildPullAdjustments(
  hbProducts: HepsiburadaProduct[],
  products: Product[],
  movements: StockMovement[],
  config: InventorySyncConfig,
  organizationId: string,
  userId: string,
): Omit<StockMovement, "id">[] {
  const adjustments: Omit<StockMovement, "id">[] = [];
  const stockOpsMap = buildHBProductsMap(products);

  for (const hbProduct of hbProducts) {
    const key = hbProduct.merchantSku;
    if (!key) continue;

    const stockOpsProduct = stockOpsMap.get(key);
    if (!stockOpsProduct) continue;

    const stockOpsQty = getStockOnHand(
      movements,
      stockOpsProduct.id,
      config.warehouseId,
    );

    const hbQty = hbProduct.availableStock;
    if (hbQty === stockOpsQty) continue;

    const difference = hbQty - stockOpsQty;

    adjustments.push({
      organizationId,
      warehouseId: config.warehouseId,
      productId: stockOpsProduct.id,
      type: "ADJUSTMENT",
      quantityChange: difference,
      reference: `HB-SYNC-${new Date().toISOString().slice(0, 10)}`,
      note: `Hepsiburada stok senkronizasyonu: ${stockOpsQty} → ${hbQty}`,
      createdById: userId,
      createdAt: new Date().toISOString(),
    });
  }

  return adjustments;
}
