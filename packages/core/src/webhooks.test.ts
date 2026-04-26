import { describe, expect, it } from "vitest";
import {
  extractExternalOrder,
  hmacSha256Base64,
  normalizeWebhookHeaders,
  verifyProviderWebhookSignature,
} from "./webhooks";

describe("webhook helpers", () => {
  it("verifies Shopify and WooCommerce HMAC signatures from the raw body", () => {
    const rawBody = Buffer.from(JSON.stringify({ id: 123, ok: true }));
    const headers = normalizeWebhookHeaders({
      "X-Shopify-Hmac-Sha256": hmacSha256Base64(rawBody, "secret"),
      "X-WC-Webhook-Signature": hmacSha256Base64(rawBody, "woo-secret"),
    });

    expect(
      verifyProviderWebhookSignature("SHOPIFY", rawBody, headers, "secret"),
    ).toMatchObject({ configured: true, valid: true });
    expect(
      verifyProviderWebhookSignature(
        "WOOCOMMERCE",
        rawBody,
        headers,
        "woo-secret",
      ),
    ).toMatchObject({ configured: true, valid: true });
    expect(
      verifyProviderWebhookSignature("SHOPIFY", rawBody, headers, "wrong"),
    ).toMatchObject({ configured: true, reason: "mismatch", valid: false });
  });

  it("extracts external orders by SKU for both providers", () => {
    expect(
      extractExternalOrder("SHOPIFY", "orders/create", {
        admin_graphql_api_id: "gid://shopify/Order/1",
        customer: { first_name: "Ada", last_name: "Lovelace" },
        line_items: [{ quantity: 2, sku: "KBD-MX-001", title: "Keyboard" }],
      }),
    ).toMatchObject({
      customerName: "Ada Lovelace",
      externalId: "gid://shopify/Order/1",
      lines: [{ quantity: 2, sku: "KBD-MX-001" }],
      source: "SHOPIFY",
    });

    expect(
      extractExternalOrder("WOOCOMMERCE", "order.created", {
        billing: { first_name: "Grace", last_name: "Hopper" },
        id: 42,
        line_items: [{ quantity: "1", sku: "MOU-WL-002" }],
      }),
    ).toMatchObject({
      customerName: "Grace Hopper",
      externalId: "42",
      lines: [{ quantity: 1, sku: "MOU-WL-002" }],
      source: "WOOCOMMERCE",
    });
  });
});
