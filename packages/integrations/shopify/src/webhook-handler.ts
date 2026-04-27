import type { Product } from "@stockops/core/types";
import {
  buildProductsMap,
  shopifyOrderToSalesOrder,
  shopifyRefundToStockMovements,
  shopifyVariantToProduct,
  validateOrderPayload,
  validateProductPayload,
} from "./mapper";
import type { ShopifyOrder, ShopifyProduct, WebhookTopic } from "./types";

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
 * Process a Shopify webhook event.
 * Validates payloads strictly - rejects malformed data instead of creating garbage.
 */
export function handleShopifyWebhook(
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
    case "products/create":
      return handleProductCreate(payload, context);
    case "products/update":
      return handleProductUpdate(payload, context);
    case "products/delete":
      return handleProductDelete(payload, context);
    case "inventory_levels/update":
      return handleInventoryLevelUpdate(payload, context);
    case "refunds/create":
      return handleRefundCreate(payload, context);
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
  if (!validateOrderPayload(payload)) {
    return {
      status: "failed",
      topic: "orders/create",
      message: "Geçersiz sipariş verisi - boş veya eksik alanlar.",
    };
  }

  const order = payload as unknown as ShopifyOrder;
  const productsMap = buildProductsMap(context.products);

  const salesOrder = shopifyOrderToSalesOrder(
    order,
    productsMap,
    context.organizationId,
    context.nextOrderCode(),
  );

  if (salesOrder.lines.length === 0) {
    return {
      status: "ignored",
      topic: "orders/create",
      message: `Sipariş ${order.name}: Eşleşen SKU bulunamadı.`,
    };
  }

  return {
    status: "processed",
    topic: "orders/create",
    message: `Sipariş ${order.name} başarıyla içe aktarıldı (${salesOrder.lines.length} kalem).`,
    data: { salesOrder, shopifyOrderId: order.id },
  };
}

function handleOrderUpdate(
  payload: unknown,
  context: WebhookContext,
): WebhookResult {
  if (!validateOrderPayload(payload)) {
    return {
      status: "failed",
      topic: "orders/updated",
      message: "Geçersiz sipariş verisi.",
    };
  }

  const order = payload as unknown as ShopifyOrder;

  return {
    status: "processed",
    topic: "orders/updated",
    message: `Sipariş ${order.name} güncelleme bildirimi alındı.`,
    data: { shopifyOrderId: order.id },
  };
}

function handleOrderCancelled(
  payload: unknown,
  context: WebhookContext,
): WebhookResult {
  if (!validateOrderPayload(payload)) {
    return {
      status: "failed",
      topic: "orders/cancelled",
      message: "Geçersiz sipariş verisi.",
    };
  }

  const order = payload as unknown as ShopifyOrder;

  return {
    status: "processed",
    topic: "orders/cancelled",
    message: `Sipariş ${order.name} iptal bildirimi alındı.`,
    data: { shopifyOrderId: order.id, cancelledAt: order.cancelledAt },
  };
}

function handleProductCreate(
  payload: unknown,
  context: WebhookContext,
): WebhookResult {
  if (!validateProductPayload(payload)) {
    return {
      status: "failed",
      topic: "products/create",
      message: "Geçersiz ürün verisi.",
    };
  }

  const product = payload as unknown as ShopifyProduct;
  const newProducts = product.variants
    .filter((v) => v.sku)
    .map((v) =>
      shopifyVariantToProduct(product, v, context.organizationId),
    );

  if (newProducts.length === 0) {
    return {
      status: "ignored",
      topic: "products/create",
      message: `Ürün ${product.title}: SKU'su olmayan varyantlar atlandı.`,
    };
  }

  return {
    status: "processed",
    topic: "products/create",
    message: `Ürün ${product.title}: ${newProducts.length} varyant içe aktarılabilir.`,
    data: { products: newProducts, shopifyProductId: product.id },
  };
}

function handleProductUpdate(
  payload: unknown,
  context: WebhookContext,
): WebhookResult {
  if (!validateProductPayload(payload)) {
    return {
      status: "failed",
      topic: "products/update",
      message: "Geçersiz ürün verisi.",
    };
  }

  const product = payload as unknown as ShopifyProduct;

  return {
    status: "processed",
    topic: "products/update",
    message: `Ürün ${product.title} güncelleme bildirimi alındı.`,
    data: { shopifyProductId: product.id },
  };
}

function handleProductDelete(
  payload: unknown,
  context: WebhookContext,
): WebhookResult {
  const data = payload as Record<string, unknown> | null;
  const productId = data?.id;

  if (!productId) {
    return {
      status: "failed",
      topic: "products/delete",
      message: "Geçersiz ürün silme verisi.",
    };
  }

  return {
    status: "processed",
    topic: "products/delete",
    message: `Shopify ürünü ${productId} silme bildirimi alındı.`,
    data: { shopifyProductId: String(productId) },
  };
}

function handleInventoryLevelUpdate(
  payload: unknown,
  context: WebhookContext,
): WebhookResult {
  const data = payload as Record<string, unknown> | null;

  if (!data?.inventory_item_id || data.available === undefined) {
    return {
      status: "failed",
      topic: "inventory_levels/update",
      message: "Geçersiz stok seviyesi verisi.",
    };
  }

  return {
    status: "processed",
    topic: "inventory_levels/update",
    message: `Stok seviyesi güncellendi: item ${data.inventory_item_id}, miktar: ${data.available}`,
    data: {
      inventoryItemId: String(data.inventory_item_id),
      locationId: String(data.location_id ?? ""),
      available: Number(data.available),
    },
  };
}

function handleRefundCreate(
  payload: unknown,
  context: WebhookContext,
): WebhookResult {
  const data = payload as Record<string, unknown> | null;

  if (!data?.id || !data?.order_id) {
    return {
      status: "failed",
      topic: "refunds/create",
      message: "Geçersiz iade verisi.",
    };
  }

  return {
    status: "processed",
    topic: "refunds/create",
    message: `İade ${data.id} alındı, sipariş: ${data.order_id}`,
    data: {
      refundId: String(data.id),
      orderId: String(data.order_id),
    },
  };
}
