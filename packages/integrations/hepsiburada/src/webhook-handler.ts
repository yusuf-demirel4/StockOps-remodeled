import type { Product } from "@stockops/core/types";
import { buildHBProductsMap, hbOrderToSalesOrder, validateOrderPayload } from "./mapper";
import type { HepsiburadaOrder, WebhookTopic } from "./types";

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
 * Process a Hepsiburada webhook (Push Service) event.
 */
export function handleHepsiburadaWebhook(
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
        message: `Bilinmeyen Hepsiburada webhook konusu: ${topic}`,
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
      message: "Geçersiz Hepsiburada sipariş verisi - boş veya eksik alanlar.",
    };
  }

  const order = payload as unknown as HepsiburadaOrder;
  const productsMap = buildHBProductsMap(context.products);

  const salesOrder = hbOrderToSalesOrder(
    order,
    productsMap,
    context.organizationId,
    context.nextOrderCode(),
  );

  if (salesOrder.lines.length === 0) {
    return {
      status: "ignored",
      topic: "orders/create",
      message: `Hepsiburada sipariş ${order.orderNumber}: Eşleşen SKU bulunamadı.`,
    };
  }

  return {
    status: "processed",
    topic: "orders/create",
    message: `Hepsiburada sipariş ${order.orderNumber} başarıyla içe aktarıldı (${salesOrder.lines.length} kalem).`,
    data: { salesOrder, hbOrderNumber: order.orderNumber },
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
      message: "Geçersiz Hepsiburada sipariş verisi.",
    };
  }

  const order = payload as unknown as HepsiburadaOrder;

  return {
    status: "processed",
    topic: "orders/updated",
    message: `Hepsiburada sipariş ${order.orderNumber} güncelleme bildirimi alındı. Durum: ${order.status}`,
    data: { hbOrderNumber: order.orderNumber, status: order.status },
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
      message: "Geçersiz Hepsiburada sipariş verisi.",
    };
  }

  const order = payload as unknown as HepsiburadaOrder;

  return {
    status: "processed",
    topic: "orders/cancelled",
    message: `Hepsiburada sipariş ${order.orderNumber} iptal edildi.`,
    data: { hbOrderNumber: order.orderNumber },
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
      message: "Geçersiz Hepsiburada sipariş verisi.",
    };
  }

  const order = payload as unknown as HepsiburadaOrder;

  return {
    status: "processed",
    topic: "orders/shipped",
    message: `Hepsiburada sipariş ${order.orderNumber} kargoya verildi.`,
    data: {
      hbOrderNumber: order.orderNumber,
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
      message: "Geçersiz Hepsiburada sipariş verisi.",
    };
  }

  const order = payload as unknown as HepsiburadaOrder;

  return {
    status: "processed",
    topic: "orders/delivered",
    message: `Hepsiburada sipariş ${order.orderNumber} teslim edildi.`,
    data: { hbOrderNumber: order.orderNumber },
  };
}
