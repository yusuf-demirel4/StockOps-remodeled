import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookSource } from "./types";

export type WebhookHeaderBag = Record<string, string | string[] | undefined>;

export type SignatureVerificationResult = {
  configured: boolean;
  valid: boolean;
  reason?: "missing-secret" | "missing-signature" | "mismatch";
};

export type ExternalOrderLine = {
  sku?: string;
  quantity: number;
  name?: string;
  externalProductId?: string;
};

export type ExternalOrder = {
  source: WebhookSource;
  topic: string;
  externalId: string;
  customerName: string;
  lines: ExternalOrderLine[];
};

export function normalizeWebhookHeaders(headers: WebhookHeaderBag) {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key.toLowerCase(),
        Array.isArray(value) ? value.join(",") : String(value),
      ]),
  );
}

export function webhookHeader(
  headers: Record<string, string>,
  key: string,
) {
  return headers[key.toLowerCase()];
}

export function hmacSha256Base64(payload: Buffer | string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64");
}

export function verifyHmacSha256Base64Signature(
  payload: Buffer | string | undefined,
  signature: string | undefined,
  secret: string | undefined,
): SignatureVerificationResult {
  if (!secret) {
    return { configured: false, valid: true, reason: "missing-secret" };
  }

  if (!payload || !signature) {
    return { configured: true, valid: false, reason: "missing-signature" };
  }

  const expected = hmacSha256Base64(payload, secret);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return { configured: true, valid: false, reason: "mismatch" };
  }

  return {
    configured: true,
    valid: timingSafeEqual(expectedBuffer, actualBuffer),
    reason: timingSafeEqual(expectedBuffer, actualBuffer)
      ? undefined
      : "mismatch",
  };
}

export function verifyProviderWebhookSignature(
  source: WebhookSource,
  rawBody: Buffer | string | undefined,
  headers: Record<string, string>,
  secret: string | undefined,
) {
  const signatureHeader =
    source === "SHOPIFY"
      ? "x-shopify-hmac-sha256"
      : "x-wc-webhook-signature";

  return verifyHmacSha256Base64Signature(
    rawBody,
    webhookHeader(headers, signatureHeader),
    secret,
  );
}

export function extractExternalOrder(
  source: WebhookSource,
  topic: string,
  payload: unknown,
): ExternalOrder | null {
  if (!isOrderTopic(source, topic) || !isRecord(payload)) {
    return null;
  }

  if (source === "SHOPIFY") {
    return extractShopifyOrder(topic, payload);
  }

  return extractWooCommerceOrder(topic, payload);
}

function isOrderTopic(source: WebhookSource, topic: string) {
  const normalizedTopic = topic.toLowerCase();

  if (source === "SHOPIFY") {
    return normalizedTopic.startsWith("orders/");
  }

  return normalizedTopic.startsWith("order.");
}

function extractShopifyOrder(topic: string, payload: Record<string, unknown>) {
  const id = stringValue(payload.admin_graphql_api_id) ?? stringValue(payload.id);
  const customer = recordValue(payload.customer);
  const customerName =
    stringValue(payload.customer_name) ??
    [stringValue(customer?.first_name), stringValue(customer?.last_name)]
      .filter(Boolean)
      .join(" ")
      .trim() ??
    stringValue(payload.email) ??
    "Shopify customer";
  const lines = arrayValue(payload.line_items)
    .map((line) => ({
      externalProductId:
        stringValue(line.variant_id) ?? stringValue(line.product_id),
      name: stringValue(line.name) ?? stringValue(line.title),
      quantity: numberValue(line.quantity),
      sku: stringValue(line.sku),
    }))
    .filter((line) => line.quantity > 0);

  if (!id || lines.length === 0) {
    return null;
  }

  return {
    source: "SHOPIFY" as const,
    topic,
    externalId: id,
    customerName: customerName || "Shopify customer",
    lines,
  };
}

function extractWooCommerceOrder(
  topic: string,
  payload: Record<string, unknown>,
) {
  const id = stringValue(payload.id);
  const billing = recordValue(payload.billing);
  const customerName =
    [stringValue(billing?.first_name), stringValue(billing?.last_name)]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    stringValue(payload.customer_note) ||
    "WooCommerce customer";
  const lines = arrayValue(payload.line_items)
    .map((line) => ({
      externalProductId:
        stringValue(line.variation_id) ?? stringValue(line.product_id),
      name: stringValue(line.name),
      quantity: numberValue(line.quantity),
      sku: stringValue(line.sku),
    }))
    .filter((line) => line.quantity > 0);

  if (!id || lines.length === 0) {
    return null;
  }

  return {
    source: "WOOCOMMERCE" as const,
    topic,
    externalId: id,
    customerName,
    lines,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function recordValue(value: unknown) {
  return isRecord(value) ? value : undefined;
}

function arrayValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function stringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
