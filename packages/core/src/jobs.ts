import type { WebhookSource } from "./types";

export const jobNames = [
  "shopify.webhook.received",
  "woocommerce.webhook.received",
  "inventory.reorder.evaluate",
  "notifications.low-stock.dispatch",
  "forecast.demand.refresh",
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
  productId?: string;
};

export type ForecastRefreshPayload = {
  organizationId?: string;
  horizonDays?: number;
};

export type JobPayloadByName = {
  "shopify.webhook.received": WebhookReceivedPayload;
  "woocommerce.webhook.received": WebhookReceivedPayload;
  "inventory.reorder.evaluate": ReorderEvaluatePayload;
  "notifications.low-stock.dispatch": NotificationPayload;
  "forecast.demand.refresh": ForecastRefreshPayload;
};

export type QueueJob<TName extends JobName = JobName> = {
  id: string;
  name: TName;
  payload: JobPayloadByName[TName];
  attempts: number;
  createdAt: string;
};
