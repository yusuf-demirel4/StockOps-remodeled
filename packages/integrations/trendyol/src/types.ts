export type TrendyolConfig = {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
};

export type TrendyolProduct = {
  barcode: string;
  title: string;
  productMainId: string;
  brandId: number;
  categoryId: number;
  quantity: number;
  salePrice: number;
  listPrice: number;
  stockCode: string;
  images: { url: string }[];
};

export type TrendyolOrderLine = {
  lineItemId: number;
  barcode: string;
  merchantSku: string;
  productName: string;
  quantity: number;
  salesCampaignId: number;
  productSize: string;
  merchantId: number;
  amount: number;
  discount: number;
  price: number;
};

export type TrendyolOrder = {
  orderNumber: string;
  grossAmount: number;
  totalDiscount: number;
  totalPrice: number;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerId: number;
  orderDate: number;
  status: string;
  lines: TrendyolOrderLine[];
  shipmentAddress: {
    city: string;
    district: string;
    fullAddress: string;
  };
  invoiceAddress: {
    city: string;
    district: string;
    fullAddress: string;
  };
  cargoTrackingNumber?: string;
  cargoProviderName?: string;
  packageHistories?: {
    createdDate: number;
    status: string;
  }[];
};

export type TrendyolInventoryItem = {
  barcode: string;
  quantity: number;
  salePrice?: number;
  listPrice?: number;
};

export type TrendyolOrdersResponse = {
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  content: TrendyolOrder[];
};

export type TrendyolProductsResponse = {
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  content: TrendyolProduct[];
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
