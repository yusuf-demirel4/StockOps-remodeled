export const jobNames = [
  "shopify.webhook.received",
  "woocommerce.webhook.received",
  "inventory.reorder.evaluate",
  "notifications.low-stock.dispatch",
  "forecast.demand.refresh",
] as const;

export type JobName = (typeof jobNames)[number];

export type QueueJob<TPayload = unknown> = {
  id: string;
  name: JobName;
  payload: TPayload;
  attempts: number;
  createdAt: string;
};
