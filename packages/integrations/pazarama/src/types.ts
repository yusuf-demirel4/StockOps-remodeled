export type PazaramaConfig = {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
};

export type PazaramaTokenInfo = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export type PazaramaOrderLine = {
  lineId: string;
  productId: string;
  merchantSku: string;
  barcode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type PazaramaOrder = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalAmount: number;
  orderDate: string;
  lines: PazaramaOrderLine[];
  shippingAddress: {
    city: string;
    district: string;
    fullAddress: string;
  };
  cargoCompany?: string;
  trackingNumber?: string;
};

export type PazaramaProduct = {
  productId: string;
  merchantSku: string;
  barcode: string;
  productName: string;
  stock: number;
  salePrice: number;
  listPrice: number;
};

export type PazaramaInventoryItem = {
  merchantSku: string;
  stock: number;
};

export type PazaramaOrdersResponse = {
  totalCount: number;
  totalPages: number;
  orders: PazaramaOrder[];
};

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
  | "orders/shipped"
  | "orders/delivered";
