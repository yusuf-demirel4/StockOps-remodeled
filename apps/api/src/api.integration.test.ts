import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  clearMemoryQueueJobs,
  getMemoryQueueJobs,
  resetQueuePublisherForTests,
} from "@stockops/queue";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "./app.module";

const token = "stockops_demo_api_key";
const authHeader = `Bearer ${token}`;

describe("StockOps API P0 flows", () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.APP_DATA_SOURCE = "demo";
    process.env.API_DEMO_TOKEN = token;
    process.env.STOCKOPS_QUEUE_DRIVER = "memory";
    process.env.STOCKOPS_QUEUE_NAME = "stockops.test";
    delete (globalThis as { stockOpsApiState?: unknown }).stockOpsApiState;
    delete (globalThis as { stockOpsApiWebhookState?: unknown })
      .stockOpsApiWebhookState;
    clearMemoryQueueJobs();
    resetQueuePublisherForTests();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix("v1");
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("requires bearer auth and returns product stock totals", async () => {
    await request(app.getHttpServer()).get("/v1/products").expect(401);

    const response = await request(app.getHttpServer())
      .get("/v1/products")
      .set("Authorization", authHeader)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "prd_kbd_mx",
          sku: "KBD-MX-001",
          totalOnHand: 34,
        }),
      ]),
    );
  });

  it("creates products and blocks duplicate SKUs", async () => {
    await request(app.getHttpServer())
      .post("/v1/products")
      .set("Authorization", authHeader)
      .send({
        sku: "P0-API-001",
        name: "P0 API Product",
        barcode: "1000000000001",
        category: "Test",
        minimumStock: 4,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          isActive: true,
          sku: "P0-API-001",
        });
      });

    await request(app.getHttpServer())
      .post("/v1/products")
      .set("Authorization", authHeader)
      .send({
        sku: "P0-API-001",
        name: "Duplicate P0 API Product",
        category: "Test",
        minimumStock: 4,
      })
      .expect(409);
  });

  it("validates stock movement references and blocks negative stock", async () => {
    await request(app.getHttpServer())
      .post("/v1/stock/movements")
      .set("Authorization", authHeader)
      .send({
        productId: "missing_product",
        warehouseId: "wh_main",
        type: "INBOUND",
        quantity: 1,
      })
      .expect(404);

    await request(app.getHttpServer())
      .post("/v1/stock/movements")
      .set("Authorization", authHeader)
      .send({
        productId: "prd_monitor_27",
        warehouseId: "wh_main",
        type: "OUTBOUND",
        quantity: 7,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post("/v1/stock/movements")
      .set("Authorization", authHeader)
      .send({
        productId: "prd_monitor_27",
        warehouseId: "wh_main",
        type: "INBOUND",
        quantity: 3,
        note: "P0 replenish",
      })
      .expect(201);

    const rows = await request(app.getHttpServer())
      .get("/v1/stock/rows")
      .set("Authorization", authHeader)
      .expect(200);
    const monitorMain = rows.body.find(
      (row: { product: { id: string }; warehouse: { id: string } }) =>
        row.product.id === "prd_monitor_27" && row.warehouse.id === "wh_main",
    );

    expect(monitorMain).toMatchObject({
      isCritical: false,
      minimumStock: 8,
      onHand: 9,
    });
  });

  it("confirms sales orders and receives purchase orders through stock ledger", async () => {
    await request(app.getHttpServer())
      .post("/v1/sales-orders/so_1001/confirm")
      .set("Authorization", authHeader)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: "so_1001",
          status: "CONFIRMED",
        });
      });

    await request(app.getHttpServer())
      .post("/v1/purchase-orders/po_2001/receive")
      .set("Authorization", authHeader)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: "po_2001",
          status: "COMPLETED",
        });
      });

    const rows = await request(app.getHttpServer())
      .get("/v1/stock/rows")
      .set("Authorization", authHeader)
      .expect(200);

    expect(
      rows.body.find(
        (row: { product: { id: string }; warehouse: { id: string } }) =>
          row.product.id === "prd_kbd_mx" && row.warehouse.id === "wh_main",
      ),
    ).toMatchObject({ onHand: 27 });
    expect(
      rows.body.find(
        (row: { product: { id: string }; warehouse: { id: string } }) =>
          row.product.id === "prd_monitor_27" && row.warehouse.id === "wh_main",
      ),
    ).toMatchObject({ onHand: 16 });
  });

  it("validates order references before writing orders", async () => {
    await request(app.getHttpServer())
      .post("/v1/sales-orders")
      .set("Authorization", authHeader)
      .send({
        customerName: "Missing Product Customer",
        productId: "missing_product",
        quantity: 1,
      })
      .expect(404);

    await request(app.getHttpServer())
      .post("/v1/purchase-orders")
      .set("Authorization", authHeader)
      .send({
        supplierId: "missing_supplier",
        productId: "prd_monitor_27",
        quantity: 1,
      })
      .expect(404);
  });

  it("accepts webhooks idempotently and publishes one queue job", async () => {
    const payload = {
      id: "gid://shopify/Product/p0-api-test",
      title: "P0 API Test",
    };

    await request(app.getHttpServer())
      .post("/v1/webhooks/shopify")
      .set("X-Shopify-Topic", "products/update")
      .set("X-Shopify-Webhook-Id", "p0-api-test-webhook")
      .send(payload)
      .expect(202)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          duplicate: false,
          queued: true,
          queue: {
            driver: "memory",
            name: "stockops.test",
          },
        });
      });

    expect(getMemoryQueueJobs()).toHaveLength(1);
    expect(getMemoryQueueJobs()[0]).toMatchObject({
      id: expect.any(String),
      name: "shopify.webhook.received",
      payload: {
        organizationId: "org_kernel_guard",
        source: "SHOPIFY",
        topic: "products/update",
      },
    });

    await request(app.getHttpServer())
      .post("/v1/webhooks/shopify")
      .set("X-Shopify-Topic", "products/update")
      .set("X-Shopify-Webhook-Id", "p0-api-test-webhook")
      .send(payload)
      .expect(202)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          duplicate: true,
          queued: false,
          queue: {
            reason: "duplicate-webhook-event",
            skipped: true,
          },
        });
      });

    expect(getMemoryQueueJobs()).toHaveLength(1);
  });
});
