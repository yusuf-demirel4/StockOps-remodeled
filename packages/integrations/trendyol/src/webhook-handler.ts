import type { Product } from "@stockops/core/types";
import { buildBarcodeProductsMap, trendyolOrderToSalesOrder, validateOrderPayload } from "./mapper";
import type { TrendyolOrder, WebhookTopic } from "./types";

export type WebhookContext = {
  organizationId: string;
  userId: string;
  defaultWarehouseId: string;
  products: Product[];
  nextOrderCode: () => string;
};

export type WebhookResult = {
  status: "processed" | "ignored" | "failed";
  topic: WebhookTopic;
  message: string;
  data?: unknown;
};

/**
 * Process a Trendyol webhook event.
 * Validates payloads strictly - rejects malformed data.
 */
export function handleTrendyolWebhook(
  topic: string,
  payload: unknown,
  context: WebhookContext,
): WebhookResult {
  const webhookTopic = topic as WebhookTopic;

  switch (webhookTopic) {
    case "orders/create":
      return handleOrderCreate(payload, context);
    case "orders/updated":
      return handleOrderUpdate(payload, context);
    case "orders/cancelled":
      return handleOrderCancelled(payload, context);
    case "orders/shipped":
      return handleOrderShipped(payload, context);
    case "orders/delivered":
      return handleOrderDelivered(payload, context);
    default:
      return {
        status: "ignored",
        topic: webhookTopic,
        message: `Bilinmeyen Trendyol webhook konusu: ${topic}`,
      };
  }
}

function handleOrderCreate(
  payload: unknown,
  context: WebhookContext,
): WebhookResult {
  if (!validateOrderPayload(payload)) {
    return {
      status: "failed",
      topic: "orders/create",
      message: "Geçersiz Trendyol sipariş verisi - boş veya eksik alanlar.",
    };
  }

  const order = payload as unknown as TrendyolOrder;
  const productsMap = buildBarcodeProductsMap(context.products);

  const salesOrder = trendyolOrderToSalesOrder(
    order,
    productsMap,
    context.organizationId,
    context.nextOrderCode(),
  );

  if (salesOrder.lines.length === 0) {
    return {
      status: "ignored",
      topic: "orders/create",
      message: `Trendyol sipariş ${order.orderNumber}: Eşleşen barkod/SKU bulunamadı.`,
    };
  }

  return {
    status: "processed",
    topic: "orders/create",
    message: `Trendyol sipariş ${order.orderNumber} başarıyla içe aktarıldı (${salesOrder.lines.length} kalem).`,
    data: { salesOrder, trendyolOrderNumber: order.orderNumber },
  };
}

function handleOrderUpdate(
  payload: unknown,
  _context: WebhookContext,
): WebhookResult {
  if (!validateOrderPayload(payload)) {
    return {
      status: "failed",
      topic: "orders/updated",
      message: "Geçersiz Trendyol sipariş verisi.",
    };
  }

  const order = payload as unknown as TrendyolOrder;

  return {
    status: "processed",
    topic: "orders/updated",
    message: `Trendyol sipariş ${order.orderNumber} güncelleme bildirimi alındı. Durum: ${order.status}`,
    data: { trendyolOrderNumber: order.orderNumber, status: order.status },
  };
}

function handleOrderCancelled(
  payload: unknown,
  _context: WebhookContext,
): WebhookResult {
  if (!validateOrderPayload(payload)) {
    return {
      status: "failed",
      topic: "orders/cancelled",
      message: "Geçersiz Trendyol sipariş verisi.",
    };
  }

  const order = payload as unknown as TrendyolOrder;

  return {
    status: "processed",
    topic: "orders/cancelled",
    message: `Trendyol sipariş ${order.orderNumber} iptal edildi.`,
    data: { trendyolOrderNumber: order.orderNumber },
  };
}

function handleOrderShipped(
  payload: unknown,
  _context: WebhookContext,
): WebhookResult {
  if (!validateOrderPayload(payload)) {
    return {
      status: "failed",
      topic: "orders/shipped",
      message: "Geçersiz Trendyol sipariş verisi.",
    };
  }

  const order = payload as unknown as TrendyolOrder;

  return {
    status: "processed",
    topic: "orders/shipped",
    message: `Trendyol sipariş ${order.orderNumber} kargoya verildi.`,
    data: {
      trendyolOrderNumber: order.orderNumber,
      cargoTrackingNumber: order.cargoTrackingNumber,
      cargoProviderName: order.cargoProviderName,
    },
  };
}

function handleOrderDelivered(
  payload: unknown,
  _context: WebhookContext,
): WebhookResult {
  if (!validateOrderPayload(payload)) {
    return {
      status: "failed",
      topic: "orders/delivered",
      message: "Geçersiz Trendyol sipariş verisi.",
    };
  }

  const order = payload as unknown as TrendyolOrder;

  return {
    status: "processed",
    topic: "orders/delivered",
    message: `Trendyol sipariş ${order.orderNumber} teslim edildi.`,
    data: { trendyolOrderNumber: order.orderNumber },
  };
}
