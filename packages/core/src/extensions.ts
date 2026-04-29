import { createHmac, timingSafeEqual } from "node:crypto";
import type { ExtensionEventName, StockOpsPlugin } from "./types";

export const EXTENSION_EVENTS: ExtensionEventName[] = [
  "order.created",
  "order.updated",
  "stock.changed",
  "invoice.issued",
  "product.updated",
  "purchase.received",
];

export function isExtensionEvent(value: string): value is ExtensionEventName {
  return EXTENSION_EVENTS.includes(value as ExtensionEventName);
}

export function validatePlugin(plugin: StockOpsPlugin) {
  if (!plugin.name.trim()) {
    throw new Error("Plugin name is required.");
  }
  if (!/^\d+\.\d+\.\d+/.test(plugin.version)) {
    throw new Error("Plugin version must be semver-like.");
  }

  for (const eventName of Object.keys(plugin.hooks)) {
    if (!isExtensionEvent(eventName)) {
      throw new Error(`Unsupported extension hook: ${eventName}`);
    }
  }

  return plugin;
}

export function signWebhookPayload(payload: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

export function verifyWebhookSignature(
  payload: string,
  secret: string,
  signature: string,
) {
  const expected = signWebhookPayload(payload, secret);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}
