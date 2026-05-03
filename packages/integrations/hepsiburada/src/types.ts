export type HepsiburadaConfig = {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
};

export type HepsiburadaOrderLine = {
  lineItemId: string;
  merchantSku: string;
  hepsiburadaSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  listPrice: number;
  commission: number;
};

export type HepsiburadaOrder = {
  orderNumber: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalPrice: number;
  orderDate: string;
  lines: HepsiburadaOrderLine[];
  shippingAddress: {
    city: string;
    district: string;
    fullAddress: string;
  };
  cargoCompany?: string;
  trackingNumber?: string;
};

export type HepsiburadaProduct = {
  merchantSku: string;
  hepsiburadaSku: string;
  barcode: string;
  productName: string;
  availableStock: number;
  price: number;
  listPrice: number;
};

export type HepsiburadaInventoryItem = {
  merchantSku: string;
  quantity: number;
};

export type HepsiburadaOrdersResponse = {
  totalCount: number;
  totalPages: number;
  orders: HepsiburadaOrder[];
};

export type HepsiburadaTicket = {
  ticketId: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  message?: string;
  createdDate: string;
};

export type InventoryUploadResponse = {
  ticketId: string;
  status: string;
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
