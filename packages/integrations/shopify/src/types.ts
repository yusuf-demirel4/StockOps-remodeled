export type ShopifyConfig = {
  shopDomain: string;
  accessToken: string;
  apiVersion: string;
  webhookSecret?: string;
};

export type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  variants: ShopifyVariant[];
  updatedAt: string;
};

export type ShopifyVariant = {
  id: string;
  title: string;
  sku: string;
  barcode: string | null;
  price: string;
  compareAtPrice: string | null;
  inventoryItemId: string;
  inventoryQuantity: number;
  weight: number | null;
  weightUnit: string | null;
};

export type ShopifyOrder = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  financialStatus: string;
  fulfillmentStatus: string | null;
  totalPrice: string;
  currency: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  lineItems: ShopifyLineItem[];
  refunds: ShopifyRefund[];
};

export type ShopifyLineItem = {
  id: string;
  title: string;
  sku: string;
  quantity: number;
  price: string;
  variantId: string | null;
  productId: string | null;
};

export type ShopifyRefund = {
  id: string;
  createdAt: string;
  refundLineItems: {
    lineItemId: string;
    quantity: number;
    restockType: "return" | "cancel" | "no_restock";
  }[];
};

export type ShopifyInventoryLevel = {
  inventoryItemId: string;
  locationId: string;
  available: number;
  updatedAt: string;
};

export type ShopifyLocation = {
  id: string;
  name: string;
  active: boolean;
};

export type SyncDirection = "push" | "pull" | "bidirectional";

export type ConflictResolution = "stockops_wins" | "shopify_wins" | "newest_wins";

export type SyncResult = {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  skippedCount: number;
  errors: SyncError[];
  startedAt: string;
  completedAt: string;
};

export type SyncError = {
  sku: string;
  message: string;
  retryable: boolean;
};

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export type WebhookTopic =
  | "orders/create"
  | "orders/updated"
  | "orders/cancelled"
  | "products/create"
  | "products/update"
  | "products/delete"
  | "inventory_levels/update"
  | "inventory_levels/connect"
  | "refunds/create";

export type ReconciliationResult = {
  totalProducts: number;
  matchedCount: number;
  discrepancies: InventoryDiscrepancy[];
  autoFixedCount: number;
  requiresManualReview: number;
  completedAt: string;
};

export type InventoryDiscrepancy = {
  sku: string;
  productName: string;
  shopifyQuantity: number;
  stockopsQuantity: number;
  difference: number;
  autoFixed: boolean;
  resolution?: string;
};
