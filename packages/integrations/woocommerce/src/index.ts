export { WooCommerceClient, WooApiError, WooCircuitOpenError } from "./client";
export {
  wooProductToProduct,
  wooOrderToSalesOrder,
  wooRefundToStockMovements,
  buildProductsMap,
  detectWooInventoryDiscrepancies,
  validateWooOrderPayload,
  validateWooProductPayload,
} from "./mapper";
export { handleWooCommerceWebhook } from "./webhook-handler";
export type { WebhookContext, WebhookResult } from "./webhook-handler";
export { pushInventoryToWooCommerce, buildPullAdjustments } from "./inventory-sync";
export type { InventorySyncConfig } from "./inventory-sync";
export { runReconciliation, formatReconciliationReport } from "./reconciliation";
export type { ReconciliationConfig } from "./reconciliation";
export type {
  WooCommerceConfig,
  WooProduct,
  WooVariation,
  WooOrder,
  WooLineItem,
  WooRefund,
  WooWebhookTopic,
  SyncResult,
  ReconciliationResult,
  CircuitBreakerState,
  ConflictResolution,
} from "./types";
