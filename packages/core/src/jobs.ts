import type { WebhookSource } from "./types";
import type { NotificationChannel } from "./types";

export const jobNames = [
  "shopify.webhook.received",
  "woocommerce.webhook.received",
  "integrations.stock-sync.dispatch",
  "inventory.reorder.evaluate",
  "notifications.low-stock.dispatch",
  "notifications.order-status.dispatch",
  "xero.invoice.sync",
  "xero.payment.sync",
  "xero.product.sync",
  "quickbooks.invoice.sync",
  "quickbooks.payment.sync",
  "quickbooks.product.sync",
] as const;

export type JobName = (typeof jobNames)[number];

export type WebhookReceivedJobName =
  | "shopify.webhook.received"
  | "woocommerce.webhook.received";

export type WebhookReceivedPayload = {
  webhookEventId: string;
  organizationId: string;
  source: WebhookSource;
  topic: string;
};

export type ReorderEvaluatePayload = {
  productId?: string;
  reason?: string;
};

export type NotificationPayload = {
  organizationId?: string;
  channel?: NotificationChannel;
  productId?: string;
  reason?: string;
};

export type StockSyncPayload = {
  organizationId?: string;
  productId?: string;
  source?: WebhookSource;
  reason?: string;
};

export type AccountingSyncPayload = {
  connectionId: string;
  organizationId: string;
  direction?: "push" | "pull";
};

export type JobPayloadByName = {
  "shopify.webhook.received": WebhookReceivedPayload;
  "woocommerce.webhook.received": WebhookReceivedPayload;
  "integrations.stock-sync.dispatch": StockSyncPayload;
  "inventory.reorder.evaluate": ReorderEvaluatePayload;
  "notifications.low-stock.dispatch": NotificationPayload;
  "notifications.order-status.dispatch": NotificationPayload;
  "xero.invoice.sync": AccountingSyncPayload;
  "xero.payment.sync": AccountingSyncPayload;
  "xero.product.sync": AccountingSyncPayload;
  "quickbooks.invoice.sync": AccountingSyncPayload;
  "quickbooks.payment.sync": AccountingSyncPayload;
  "quickbooks.product.sync": AccountingSyncPayload;
};

export type QueueJob<TName extends JobName = JobName> = {
  id: string;
  name: TName;
  payload: JobPayloadByName[TName];
  attempts: number;
  createdAt: string;
};
