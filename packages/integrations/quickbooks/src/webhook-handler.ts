import crypto from "node:crypto";
import type { QBWebhookPayload, QBWebhookEvent } from "./types";

/**
 * Verify QuickBooks webhook signature.
 * QuickBooks sends HMAC-SHA256 base64 in intuit-signature header.
 */
export function verifyQuickBooksWebhookSignature(
  payload: string,
  signature: string,
  verifierToken: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", verifierToken)
    .update(payload)
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Parse and categorize QuickBooks webhook events.
 */
export function categorizeQBEvents(payload: QBWebhookPayload) {
  const invoiceEvents: QBWebhookEvent[] = [];
  const paymentEvents: QBWebhookEvent[] = [];
  const itemEvents: QBWebhookEvent[] = [];

  for (const notification of payload.eventNotifications) {
    for (const entity of notification.dataChangeEvent.entities) {
      switch (entity.name) {
        case "Invoice":
          invoiceEvents.push(entity);
          break;
        case "Payment":
          paymentEvents.push(entity);
          break;
        case "Item":
          itemEvents.push(entity);
          break;
      }
    }
  }

  return { invoiceEvents, paymentEvents, itemEvents };
}
