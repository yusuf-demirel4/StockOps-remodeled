export { ShopifyClient, ShopifyApiError, ShopifyCircuitOpenError } from "./client";
export {
  shopifyVariantToProduct,
  shopifyOrderToSalesOrder,
  shopifyRefundToStockMovements,
  buildProductsMap,
  detectInventoryDiscrepancies,
  validateOrderPayload,
  validateProductPayload,
} from "./mapper";
export { handleShopifyWebhook } from "./webhook-handler";
export type { WebhookContext, WebhookResult } from "./webhook-handler";
export {
  pushInventoryToShopify,
  buildPullAdjustments,
  resolveBidirectionalConflicts,
} from "./inventory-sync";
export type { InventorySyncConfig } from "./inventory-sync";
export { runReconciliation, formatReconciliationReport } from "./reconciliation";
export type { ReconciliationConfig } from "./reconciliation";
export type {
  ShopifyConfig,
  ShopifyProduct,
  ShopifyVariant,
  ShopifyOrder,
  ShopifyLineItem,
  ShopifyRefund,
  ShopifyInventoryLevel,
  ShopifyLocation,
  SyncDirection,
  ConflictResolution,
  SyncResult,
  SyncError,
  CircuitBreakerState,
  WebhookTopic,
  ReconciliationResult,
  InventoryDiscrepancy,
} from "./types";
