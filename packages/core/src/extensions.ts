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

export class PluginManager {
  private plugins: StockOpsPlugin[] = [];

  register(plugin: StockOpsPlugin) {
    this.plugins.push(validatePlugin(plugin));
  }

  async dispatch<T extends ExtensionEventName>(
    eventName: T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any,
  ): Promise<void> {
    if (!isExtensionEvent(eventName)) return;

    for (const plugin of this.plugins) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hook = plugin.hooks[eventName] as ((data: any) => Promise<void>) | undefined;
      if (hook) {
        try {
          await hook(payload);
        } catch (error) {
          console.error(`[PluginManager] Plugin ${plugin.name} failed on hook ${eventName}:`, error);
        }
      }
    }
  }
}

export const globalPluginManager = new PluginManager();

