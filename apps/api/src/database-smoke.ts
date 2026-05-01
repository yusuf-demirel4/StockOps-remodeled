import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getPrisma } from "@stockops/db";
import request from "supertest";

import { AppModule } from "./app.module";

type ProductListItem = {
  sku: string;
  totalOnHand: number;
};

type OrderListItem = {
  code: string;
};

function readListBody<T>(body: unknown, name: string): T[] {
  if (Array.isArray(body)) {
    return body as T[];
  }

  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    Array.isArray((body as { data?: unknown }).data)
  ) {
    return (body as { data: T[] }).data;
  }

  throw new Error(`Expected ${name} response to be an array or paginated data object.`);
}

function assertSmoke(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function createApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix("v1");
  await app.init();

  return app;
}

async function main() {
  process.env.APP_DATA_SOURCE = "database";
  process.env.API_DEMO_TOKEN ??= "stockops_demo_api_key";
  process.env.STOCKOPS_QUEUE_DRIVER ??= "memory";

  assertSmoke(
    process.env.DATABASE_URL,
    "DATABASE_URL is required for database smoke checks.",
  );

  let app: INestApplication | undefined;

  try {
    app = await createApp();
    const server = app.getHttpServer();
    const authorization = `Bearer ${process.env.API_DEMO_TOKEN}`;

    const auth = await request(server)
      .get("/v1/auth/me")
      .set("Authorization", authorization)
      .expect(200);
    assertSmoke(
      auth.body.organization?.slug === "kernelguard",
      "Expected seeded kernelguard organization.",
    );
    assertSmoke(auth.body.role === "Owner", "Expected seeded Owner API role.");

    const products = await request(server)
      .get("/v1/products")
      .set("Authorization", authorization)
      .expect(200);
    assertSmoke(
      Array.isArray(products.body) && products.body.length >= 3,
      "Expected at least three seeded products.",
    );
    const keyboard = (products.body as ProductListItem[]).find(
      (product) => product.sku === "KBD-MX-001",
    );
    assertSmoke(keyboard, "Expected seeded keyboard SKU.");
    assertSmoke(
      Number.isInteger(keyboard.totalOnHand),
      "Expected product totalOnHand to be calculated.",
    );

    await request(server)
      .get("/v1/stock/alerts")
      .set("Authorization", authorization)
      .expect(200)
      .expect(({ body }) => {
        assertSmoke(Array.isArray(body), "Expected stock alerts array.");
      });

    const salesOrders = await request(server)
      .get("/v1/sales-orders")
      .set("Authorization", authorization)
      .expect(200);
    const salesOrderRows = readListBody<OrderListItem>(
      salesOrders.body,
      "sales orders",
    );
    assertSmoke(
      salesOrderRows.some((order) => order.code === "SO-1001"),
      "Expected seeded sales order SO-1001.",
    );

    const purchaseOrders = await request(server)
      .get("/v1/purchase-orders")
      .set("Authorization", authorization)
      .expect(200);
    const purchaseOrderRows = readListBody<OrderListItem>(
      purchaseOrders.body,
      "purchase orders",
    );
    assertSmoke(
      purchaseOrderRows.some((order) => order.code === "PO-2001"),
      "Expected seeded purchase order PO-2001.",
    );

    const webhookId = `database-smoke-${Date.now()}`;
    await request(server)
      .post("/v1/webhooks/shopify")
      .set("X-Shopify-Topic", "products/update")
      .set("X-Shopify-Webhook-Id", webhookId)
      .send({
        id: "gid://shopify/Product/database-smoke",
        title: "Database Smoke Product",
      })
      .expect(202)
      .expect(({ body }) => {
        assertSmoke(body.queued === true, "Expected webhook to publish a job.");
        assertSmoke(
          body.queue?.driver === "memory",
          "Expected memory queue driver for smoke checks.",
        );
      });

    const prisma = getPrisma();
    const tokenCount = await prisma.apiToken.count({
      where: { revokedAt: null },
    });
    const webhookCount = await prisma.webhookEvent.count({
      where: { externalId: webhookId },
    });

    assertSmoke(tokenCount > 0, "Expected at least one active API token.");
    assertSmoke(webhookCount === 1, "Expected persisted webhook event.");

    console.log(
      JSON.stringify({
        databaseUrl: maskDatabaseUrl(process.env.DATABASE_URL),
        organization: auth.body.organization.slug,
        products: products.body.length,
        service: "stockops-api",
        status: "database-smoke-ok",
        webhookId,
      }),
    );
  } finally {
    await app?.close();
    await disconnectPrisma();
  }
}

function maskDatabaseUrl(value: string) {
  const url = new URL(value);

  if (url.password) {
    url.password = "****";
  }

  return url.toString();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectPrisma();
  process.exit(1);
});

async function disconnectPrisma() {
  try {
    await getPrisma().$disconnect();
  } catch {
    // The smoke script can fail before Prisma is initialized.
  }
}
