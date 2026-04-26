import type { WebhookSource } from "./types";
import type { NotificationChannel } from "./types";

export const jobNames = [
  "shopify.webhook.received",
  "woocommerce.webhook.received",
  "integrations.stock-sync.dispatch",
  "inventory.reorder.evaluate",
  "notifications.low-stock.dispatch",
  "notifications.order-status.dispatch",
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

export type JobPayloadByName = {
  "shopify.webhook.received": WebhookReceivedPayload;
  "woocommerce.webhook.received": WebhookReceivedPayload;
  "integrations.stock-sync.dispatch": StockSyncPayload;
  "inventory.reorder.evaluate": ReorderEvaluatePayload;
  "notifications.low-stock.dispatch": NotificationPayload;
  "notifications.order-status.dispatch": NotificationPayload;
};

export type QueueJob<TName extends JobName = JobName> = {
  id: string;
  name: TName;
  payload: JobPayloadByName[TName];
  attempts: number;
  createdAt: string;
};
