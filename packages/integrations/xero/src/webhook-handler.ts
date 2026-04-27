import crypto from "node:crypto";
import type { XeroWebhookEvent } from "./types";

/**
 * Verify Xero webhook signature using HMAC-SHA256.
 * Xero sends a base64-encoded HMAC in the x-xero-signature header.
 */
export function verifyXeroWebhookSignature(
  payload: string,
  signature: string,
  webhookKey: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", webhookKey)
    .update(payload)
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export type XeroWebhookPayload = {
  events: XeroWebhookEvent[];
  firstEventSequence: number;
  lastEventSequence: number;
  entropy: string;
};

/**
 * Parse and categorize Xero webhook events.
 */
export function categorizeXeroEvents(payload: XeroWebhookPayload) {
  const invoiceEvents: XeroWebhookEvent[] = [];
  const paymentEvents: XeroWebhookEvent[] = [];
  const contactEvents: XeroWebhookEvent[] = [];

  for (const event of payload.events) {
    if (event.resourceUrl.includes("/Invoices/")) {
      invoiceEvents.push(event);
    } else if (event.resourceUrl.includes("/Payments/")) {
      paymentEvents.push(event);
    } else if (event.resourceUrl.includes("/Contacts/")) {
      contactEvents.push(event);
    }
  }

  return { invoiceEvents, paymentEvents, contactEvents };
}
