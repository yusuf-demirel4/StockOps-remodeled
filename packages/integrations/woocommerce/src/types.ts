export type WooCommerceConfig = {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  webhookSecret?: string;
};

export type WooProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  status: "publish" | "draft" | "pending" | "private";
  type: "simple" | "variable" | "grouped" | "external";
  regular_price: string;
  sale_price: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: "instock" | "outofstock" | "onbackorder";
  categories: { id: number; name: string }[];
  variations: number[];
  date_modified: string;
};

export type WooVariation = {
  id: number;
  sku: string;
  regular_price: string;
  sale_price: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  attributes: { id: number; name: string; option: string }[];
  weight: string;
  date_modified: string;
};

export type WooOrder = {
  id: number;
  number: string;
  status: string;
  date_created: string;
  date_modified: string;
  total: string;
  currency: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
  };
  line_items: WooLineItem[];
  refunds: WooRefund[];
};

export type WooLineItem = {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  sku: string;
  price: string;
  total: string;
};

export type WooRefund = {
  id: number;
  reason: string;
  total: string;
  line_items: {
    id: number;
    product_id: number;
    quantity: number;
    sku: string;
  }[];
};

export type WooWebhookTopic =
  | "order.created"
  | "order.updated"
  | "order.deleted"
  | "product.created"
  | "product.updated"
  | "product.deleted";

export type SyncResult = {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  skippedCount: number;
  errors: { sku: string; message: string; retryable: boolean }[];
  startedAt: string;
  completedAt: string;
};

export type ReconciliationResult = {
  totalProducts: number;
  matchedCount: number;
  discrepancies: {
    sku: string;
    productName: string;
    wooQuantity: number;
    stockopsQuantity: number;
    difference: number;
    autoFixed: boolean;
    resolution?: string;
  }[];
  autoFixedCount: number;
  requiresManualReview: number;
  completedAt: string;
};

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";
export type ConflictResolution = "stockops_wins" | "woocommerce_wins" | "newest_wins";
