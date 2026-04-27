import type { Product } from "@stockops/core/types";
import {
  buildProductsMap,
  validateWooOrderPayload,
  validateWooProductPayload,
  wooOrderToSalesOrder,
  wooProductToProduct,
} from "./mapper";
import type { WooOrder, WooProduct, WooWebhookTopic } from "./types";

export type WebhookContext = {
  organizationId: string;
  userId: string;
  defaultWarehouseId: string;
  products: Product[];
  nextOrderCode: () => string;
};

export type WebhookResult = {
  status: "processed" | "ignored" | "failed";
  topic: WooWebhookTopic;
  message: string;
  data?: unknown;
};

export function handleWooCommerceWebhook(
  topic: string,
  payload: unknown,
  context: WebhookContext,
): WebhookResult {
  const webhookTopic = topic as WooWebhookTopic;

  switch (webhookTopic) {
    case "order.created":
      return handleOrderCreate(payload, context);
    case "order.updated":
      return handleOrderUpdate(payload, context);
    case "order.deleted":
      return handleOrderDeleted(payload, context);
    case "product.created":
      return handleProductCreate(payload, context);
    case "product.updated":
      return handleProductUpdate(payload, context);
    case "product.deleted":
      return handleProductDelete(payload, context);
    default:
      return {
        status: "ignored",
        topic: webhookTopic,
        message: `Bilinmeyen webhook konusu: ${topic}`,
      };
  }
}

function handleOrderCreate(
  payload: unknown,
  context: WebhookContext,
): WebhookResult {
  if (!validateWooOrderPayload(payload)) {
    return {
      status: "failed",
      topic: "order.created",
      message: "Geçersiz sipariş verisi - boş veya eksik alanlar.",
    };
  }

  const order = payload as unknown as WooOrder;
  const productsMap = buildProductsMap(context.products);

  const salesOrder = wooOrderToSalesOrder(
    order,
    productsMap,
    context.organizationId,
    context.nextOrderCode(),
  );

  if (salesOrder.lines.length === 0) {
    return {
      status: "ignored",
      topic: "order.created",
      message: `Sipariş #${order.number}: Eşleşen SKU bulunamadı.`,
    };
  }

  return {
    status: "processed",
    topic: "order.created",
    message: `Sipariş #${order.number} başarıyla içe aktarıldı (${salesOrder.lines.length} kalem).`,
    data: { salesOrder, wooOrderId: order.id },
  };
}

function handleOrderUpdate(
  payload: unknown,
  context: WebhookContext,
): WebhookResult {
  if (!validateWooOrderPayload(payload)) {
    return {
      status: "failed",
      topic: "order.updated",
      message: "Geçersiz sipariş verisi.",
    };
  }

  const order = payload as unknown as WooOrder;

  return {
    status: "processed",
    topic: "order.updated",
    message: `Sipariş #${order.number} güncelleme bildirimi alındı.`,
    data: { wooOrderId: order.id, status: order.status },
  };
}

function handleOrderDeleted(
  payload: unknown,
  _context: WebhookContext,
): WebhookResult {
  const data = payload as Record<string, unknown> | null;

  if (!data?.id) {
    return {
      status: "failed",
      topic: "order.deleted",
      message: "Geçersiz sipariş silme verisi.",
    };
  }

  return {
    status: "processed",
    topic: "order.deleted",
    message: `Sipariş ${data.id} silme bildirimi alındı.`,
    data: { wooOrderId: data.id },
  };
}

function handleProductCreate(
  payload: unknown,
  context: WebhookContext,
): WebhookResult {
  if (!validateWooProductPayload(payload)) {
    return {
      status: "failed",
      topic: "product.created",
      message: "Geçersiz ürün verisi.",
    };
  }

  const wooProduct = payload as unknown as WooProduct;

  if (!wooProduct.sku) {
    return {
      status: "ignored",
      topic: "product.created",
      message: `Ürün ${wooProduct.name}: SKU tanımlı değil, atlandı.`,
    };
  }

  const product = wooProductToProduct(wooProduct, context.organizationId);

  return {
    status: "processed",
    topic: "product.created",
    message: `Ürün ${wooProduct.name} içe aktarılabilir.`,
    data: { product, wooProductId: wooProduct.id },
  };
}

function handleProductUpdate(
  payload: unknown,
  _context: WebhookContext,
): WebhookResult {
  if (!validateWooProductPayload(payload)) {
    return {
      status: "failed",
      topic: "product.updated",
      message: "Geçersiz ürün verisi.",
    };
  }

  const wooProduct = payload as unknown as WooProduct;

  return {
    status: "processed",
    topic: "product.updated",
    message: `Ürün ${wooProduct.name} güncelleme bildirimi alındı.`,
    data: { wooProductId: wooProduct.id },
  };
}

function handleProductDelete(
  payload: unknown,
  _context: WebhookContext,
): WebhookResult {
  const data = payload as Record<string, unknown> | null;

  if (!data?.id) {
    return {
      status: "failed",
      topic: "product.deleted",
      message: "Geçersiz ürün silme verisi.",
    };
  }

  return {
    status: "processed",
    topic: "product.deleted",
    message: `WooCommerce ürünü ${data.id} silme bildirimi alındı.`,
    data: { wooProductId: data.id },
  };
}
