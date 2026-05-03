import type { Product } from "@stockops/core/types";
import { buildPazaramaProductsMap, pazaramaOrderToSalesOrder, validateOrderPayload } from "./mapper";
import type { PazaramaOrder, WebhookTopic } from "./types";

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
 * Process a Pazarama webhook event.
 */
export function handlePazaramaWebhook(
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
        message: `Bilinmeyen Pazarama webhook konusu: ${topic}`,
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
      message: "Geçersiz Pazarama sipariş verisi - boş veya eksik alanlar.",
    };
  }

  const order = payload as unknown as PazaramaOrder;
  const productsMap = buildPazaramaProductsMap(context.products);

  const salesOrder = pazaramaOrderToSalesOrder(
    order,
    productsMap,
    context.organizationId,
    context.nextOrderCode(),
  );

  if (salesOrder.lines.length === 0) {
    return {
      status: "ignored",
      topic: "orders/create",
      message: `Pazarama sipariş ${order.orderNumber}: Eşleşen SKU bulunamadı.`,
    };
  }

  return {
    status: "processed",
    topic: "orders/create",
    message: `Pazarama sipariş ${order.orderNumber} başarıyla içe aktarıldı (${salesOrder.lines.length} kalem).`,
    data: { salesOrder, pazaramaOrderNumber: order.orderNumber },
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
      message: "Geçersiz Pazarama sipariş verisi.",
    };
  }

  const order = payload as unknown as PazaramaOrder;

  return {
    status: "processed",
    topic: "orders/updated",
    message: `Pazarama sipariş ${order.orderNumber} güncelleme bildirimi alındı. Durum: ${order.status}`,
    data: { pazaramaOrderNumber: order.orderNumber, status: order.status },
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
      message: "Geçersiz Pazarama sipariş verisi.",
    };
  }

  const order = payload as unknown as PazaramaOrder;

  return {
    status: "processed",
    topic: "orders/cancelled",
    message: `Pazarama sipariş ${order.orderNumber} iptal edildi.`,
    data: { pazaramaOrderNumber: order.orderNumber },
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
      message: "Geçersiz Pazarama sipariş verisi.",
    };
  }

  const order = payload as unknown as PazaramaOrder;

  return {
    status: "processed",
    topic: "orders/shipped",
    message: `Pazarama sipariş ${order.orderNumber} kargoya verildi.`,
    data: {
      pazaramaOrderNumber: order.orderNumber,
      trackingNumber: order.trackingNumber,
      cargoCompany: order.cargoCompany,
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
      message: "Geçersiz Pazarama sipariş verisi.",
    };
  }

  const order = payload as unknown as PazaramaOrder;

  return {
    status: "processed",
    topic: "orders/delivered",
    message: `Pazarama sipariş ${order.orderNumber} teslim edildi.`,
    data: { pazaramaOrderNumber: order.orderNumber },
  };
}
