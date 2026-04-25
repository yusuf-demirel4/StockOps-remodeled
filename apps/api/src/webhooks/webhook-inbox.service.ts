import { Injectable } from "@nestjs/common";

type WebhookSource = "shopify" | "woocommerce";

@Injectable()
export class WebhookInboxService {
  accept(source: WebhookSource, topic: string | undefined, body: unknown) {
    return {
      accepted: true,
      id: `wh_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      source,
      topic: topic ?? "unknown",
      queued: true,
      receivedAt: new Date().toISOString(),
      payloadType: typeof body,
    };
  }
}
