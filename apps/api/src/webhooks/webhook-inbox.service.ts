import { Injectable, NotFoundException } from "@nestjs/common";
import { createInitialState } from "@stockops/core/demo-data";
import type { WebhookReceivedJobName } from "@stockops/core/jobs";
import { hashToken } from "@stockops/core/tokens";
import type {
  AppState,
  WebhookEvent,
  WebhookSource,
} from "@stockops/core/types";
import { getPrisma } from "@stockops/db";
import { publishJob } from "@stockops/queue";

type HeaderBag = Record<string, string | string[] | undefined>;
type PublicWebhookSource = "shopify" | "woocommerce";

const globalForWebhookDemo = globalThis as typeof globalThis & {
  stockOpsApiWebhookState?: AppState;
};

function demoState() {
  globalForWebhookDemo.stockOpsApiWebhookState ??= createInitialState();
  globalForWebhookDemo.stockOpsApiWebhookState.webhookEvents ??= [];

  return globalForWebhookDemo.stockOpsApiWebhookState;
}

function normalizeSource(source: PublicWebhookSource): WebhookSource {
  return source === "shopify" ? "SHOPIFY" : "WOOCOMMERCE";
}

function normalizeHeaders(headers: HeaderBag) {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key.toLowerCase(),
        Array.isArray(value) ? value.join(",") : String(value),
      ]),
  );
}

function header(headers: Record<string, string>, key: string) {
  return headers[key.toLowerCase()];
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function externalIdFor(
  source: WebhookSource,
  headers: Record<string, string>,
  body: unknown,
) {
  if (source === "SHOPIFY") {
    return (
      header(headers, "x-shopify-webhook-id") ??
      header(headers, "x-shopify-event-id")
    );
  }

  if (source === "WOOCOMMERCE") {
    return header(headers, "x-wc-webhook-delivery-id");
  }

  if (
    body &&
    typeof body === "object" &&
    "id" in body &&
    typeof body.id === "string"
  ) {
    return body.id;
  }

  return undefined;
}

function dedupeKeyFor(source: WebhookSource, topic: string, body: unknown, externalId?: string) {
  return `${source}:${topic}:${externalId ?? hashToken(JSON.stringify(jsonValue(body)))}`;
}

function jobNameFor(source: WebhookSource): WebhookReceivedJobName {
  return source === "SHOPIFY"
    ? "shopify.webhook.received"
    : "woocommerce.webhook.received";
}

@Injectable()
export class WebhookInboxService {
  async accept(
    source: PublicWebhookSource,
    topic: string | undefined,
    body: unknown,
    rawHeaders: HeaderBag,
  ) {
    const normalizedSource = normalizeSource(source);
    const headers = normalizeHeaders(rawHeaders);
    const eventTopic = topic ?? "unknown";
    const externalId = externalIdFor(normalizedSource, headers, body);
    const dedupeKey = dedupeKeyFor(normalizedSource, eventTopic, body, externalId);

    if (process.env.APP_DATA_SOURCE === "database") {
      return this.acceptDatabaseEvent(
        normalizedSource,
        eventTopic,
        body,
        headers,
        dedupeKey,
        externalId,
      );
    }

    return this.acceptDemoEvent(
      normalizedSource,
      eventTopic,
      body,
      headers,
      dedupeKey,
      externalId,
    );
  }

  private async acceptDemoEvent(
    source: WebhookSource,
    topic: string,
    body: unknown,
    headers: Record<string, string>,
    dedupeKey: string,
    externalId?: string,
  ) {
    const state = demoState();
    const organization = state.organizations[0];
    const duplicate = state.webhookEvents?.find(
      (event) => event.dedupeKey === dedupeKey,
    );

    if (duplicate) {
      return this.response(duplicate.id, source, topic, true, organization.id);
    }

    const event: WebhookEvent = {
      id: id("wh"),
      organizationId: organization.id,
      source,
      topic,
      externalId,
      dedupeKey,
      status: "PENDING",
      payload: jsonValue(body),
      headers,
      attempts: 0,
      receivedAt: new Date().toISOString(),
    };

    state.webhookEvents?.unshift(event);
    return this.response(event.id, source, topic, false, organization.id);
  }

  private async acceptDatabaseEvent(
    source: WebhookSource,
    topic: string,
    body: unknown,
    headers: Record<string, string>,
    dedupeKey: string,
    externalId?: string,
  ) {
    const prisma = getPrisma();
    const duplicate = await prisma.webhookEvent.findUnique({
      where: { dedupeKey },
    });

    if (duplicate) {
      return this.response(duplicate.id, source, topic, true, duplicate.organizationId);
    }

    const organization = await prisma.organization.findUnique({
      where: {
        slug: process.env.WEBHOOK_DEFAULT_ORGANIZATION_SLUG ?? "kernelguard",
      },
    });

    if (!organization) {
      throw new NotFoundException("Default webhook organization not found.");
    }

    const event = await prisma.webhookEvent.create({
      data: {
        organizationId: organization.id,
        source,
        topic,
        externalId: externalId ?? null,
        dedupeKey,
        payload: jsonValue(body),
        headers: jsonValue(headers),
      },
    });

    return this.response(event.id, source, topic, false, organization.id);
  }

  private async response(
    id: string,
    source: WebhookSource,
    topic: string,
    duplicate: boolean,
    organizationId: string,
  ) {
    const job = {
      name: jobNameFor(source),
      payload: {
        webhookEventId: id,
        organizationId,
        source,
        topic,
      },
    };

    if (duplicate) {
      return {
        accepted: true,
        duplicate,
        id,
        organizationId,
        source: source.toLowerCase(),
        topic,
        queued: false,
        job,
        queue: {
          reason: "duplicate-webhook-event",
          skipped: true,
        },
        receivedAt: new Date().toISOString(),
      };
    }

    const queued = await publishJob(job.name, job.payload, {
      attempts: 5,
      backoffMs: 5000,
      jobId: id,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });

    return {
      accepted: true,
      duplicate,
      id,
      organizationId,
      source: source.toLowerCase(),
      topic,
      queued: true,
      job,
      queue: {
        driver: queued.driver,
        jobId: queued.jobId,
        name: queued.queueName,
      },
      receivedAt: new Date().toISOString(),
    };
  }
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
