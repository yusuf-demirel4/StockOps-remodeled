import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  clearMemoryQueueJobs,
  getMemoryQueueJobs,
  resetQueuePublisherForTests,
} from "@stockops/queue";
import { hmacSha256Base64 } from "@stockops/core/webhooks";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "./app.module";
import { validateApiEnvironment } from "./config/env";

const token = "stockops_demo_api_key";
const authHeader = `Bearer ${token}`;

describe("StockOps API P0 flows", () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.APP_DATA_SOURCE = "demo";
    process.env.API_DEMO_TOKEN = token;
    process.env.STOCKOPS_QUEUE_DRIVER = "memory";
    process.env.STOCKOPS_QUEUE_NAME = "stockops.test";
    delete process.env.SHOPIFY_WEBHOOK_SECRET;
    delete process.env.WOOCOMMERCE_WEBHOOK_SECRET;
    delete (globalThis as { stockOpsApiState?: unknown }).stockOpsApiState;
    delete (globalThis as { stockOpsApiWebhookState?: unknown })
      .stockOpsApiWebhookState;
    clearMemoryQueueJobs();
    resetQueuePublisherForTests();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false, rawBody: true });
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

  it("replays idempotent mutations and rejects key reuse with a different body", async () => {
    const idempotencyKey = "phase7-product-create";
    const payload = {
      sku: "P7-IDEMPOTENT-001",
      name: "Phase 7 Idempotent Product",
      category: "Security",
      minimumStock: 2,
    };

    const first = await request(app.getHttpServer())
      .post("/v1/products")
      .set("Authorization", authHeader)
      .set("Idempotency-Key", idempotencyKey)
      .send(payload)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post("/v1/products")
      .set("Authorization", authHeader)
      .set("Idempotency-Key", idempotencyKey)
      .send(payload)
      .expect(201);

    expect(second.headers["idempotency-replayed"]).toBe("true");
    expect(second.body).toEqual(first.body);

    await request(app.getHttpServer())
      .post("/v1/products")
      .set("Authorization", authHeader)
      .set("Idempotency-Key", idempotencyKey)
      .send({ ...payload, sku: "P7-IDEMPOTENT-002" })
      .expect(409);

    const products = await request(app.getHttpServer())
      .get("/v1/products")
      .set("Authorization", authHeader)
      .expect(200);

    expect(
      products.body.filter(
        (product: { sku: string }) => product.sku === payload.sku,
      ),
    ).toHaveLength(1);
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

  it("transfers stock between warehouses through paired ledger movements", async () => {
    await request(app.getHttpServer())
      .post("/v1/stock/transfers")
      .set("Authorization", authHeader)
      .send({
        productId: "prd_kbd_mx",
        sourceWarehouseId: "wh_main",
        destinationWarehouseId: "wh_showroom",
        quantity: 5,
        note: "Move display inventory",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.reference).toMatch(/^TR-/);
        expect(body.movements).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              productId: "prd_kbd_mx",
              quantityChange: -5,
              type: "TRANSFER",
              warehouseId: "wh_main",
            }),
            expect.objectContaining({
              productId: "prd_kbd_mx",
              quantityChange: 5,
              type: "TRANSFER",
              warehouseId: "wh_showroom",
            }),
          ]),
        );
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
    ).toMatchObject({ onHand: 25 });
    expect(
      rows.body.find(
        (row: { product: { id: string }; warehouse: { id: string } }) =>
          row.product.id === "prd_kbd_mx" && row.warehouse.id === "wh_showroom",
      ),
    ).toMatchObject({ onHand: 9 });

    await request(app.getHttpServer())
      .post("/v1/stock/transfers")
      .set("Authorization", authHeader)
      .send({
        productId: "prd_monitor_27",
        sourceWarehouseId: "wh_showroom",
        destinationWarehouseId: "wh_main",
        quantity: 1,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post("/v1/stock/transfers")
      .set("Authorization", authHeader)
      .send({
        productId: "prd_kbd_mx",
        sourceWarehouseId: "wh_main",
        destinationWarehouseId: "wh_main",
        quantity: 1,
      })
      .expect(400);
  });

  it("creates warehouses and updates the default warehouse", async () => {
    await request(app.getHttpServer())
      .post("/v1/stock/warehouses")
      .set("Authorization", authHeader)
      .send({
        code: "WEST",
        name: "West Hub",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: "WEST",
          isDefault: false,
          name: "West Hub",
        });
      });

    const created = await request(app.getHttpServer())
      .post("/v1/stock/warehouses")
      .set("Authorization", authHeader)
      .send({
        code: "EAST",
        isDefault: true,
        name: "East Hub",
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/v1/stock/warehouses/${created.body.id}`)
      .set("Authorization", authHeader)
      .send({
        code: "EAST-A",
        isDefault: true,
        name: "East Hub A",
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: "EAST-A",
          isDefault: true,
          name: "East Hub A",
        });
      });

    const warehouses = await request(app.getHttpServer())
      .get("/v1/stock/warehouses")
      .set("Authorization", authHeader)
      .expect(200);

    expect(
      warehouses.body
        .filter((warehouse: { isDefault: boolean }) => warehouse.isDefault)
        .map((warehouse: { code: string }) => warehouse.code),
    ).toEqual(["EAST-A"]);

    await request(app.getHttpServer())
      .post("/v1/stock/warehouses")
      .set("Authorization", authHeader)
      .send({
        code: "EAST-A",
        name: "Duplicate East",
      })
      .expect(409);
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

  it("verifies provider webhook signatures when provider secrets are configured", async () => {
    process.env.SHOPIFY_WEBHOOK_SECRET = "shopify-webhook-secret";
    const rawBody = JSON.stringify({
      admin_graphql_api_id: "gid://shopify/Order/1001",
      line_items: [{ quantity: 1, sku: "KBD-MX-001" }],
    });

    await request(app.getHttpServer())
      .post("/v1/webhooks/shopify")
      .set("Content-Type", "application/json")
      .set("X-Shopify-Topic", "orders/create")
      .set("X-Shopify-Webhook-Id", "signed-shopify-webhook")
      .set("X-Shopify-Hmac-Sha256", "bad-signature")
      .send(rawBody)
      .expect(403);

    await request(app.getHttpServer())
      .post("/v1/webhooks/shopify")
      .set("Content-Type", "application/json")
      .set("X-Shopify-Topic", "orders/create")
      .set("X-Shopify-Webhook-Id", "signed-shopify-webhook")
      .set(
        "X-Shopify-Hmac-Sha256",
        hmacSha256Base64(Buffer.from(rawBody), "shopify-webhook-secret"),
      )
      .send(rawBody)
      .expect(202)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          duplicate: false,
          verification: {
            providerSignature: "verified",
          },
        });
      });

    expect(getMemoryQueueJobs()).toHaveLength(1);
  });

  it("requires provider delivery id and topic for production webhook replay protection", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.STOCKOPS_ALLOW_UNSIGNED_PROVIDER_WEBHOOKS = "true";

    await request(app.getHttpServer())
      .post("/v1/webhooks/shopify")
      .send({ id: "gid://shopify/Product/missing-topic-and-id" })
      .expect(400);

    await request(app.getHttpServer())
      .post("/v1/webhooks/shopify")
      .set("X-Shopify-Topic", "products/update")
      .send({ id: "gid://shopify/Product/missing-id" })
      .expect(400);

    process.env.NODE_ENV = previousNodeEnv;
    delete process.env.STOCKOPS_ALLOW_UNSIGNED_PROVIDER_WEBHOOKS;
  });

  it("completes commercial workflow: customer, invoice, payment, credit note", async () => {
    // 1. Create a customer
    const { body: customer } = await request(app.getHttpServer())
      .post("/v1/customers")
      .set("Authorization", authHeader)
      .send({
        code: "CUS-TEST",
        name: "Test Customer",
        email: "test@example.com",
      })
      .expect(201);

    expect(customer.id).toBeDefined();

    // 2. Create an invoice
    const { body: invoice } = await request(app.getHttpServer())
      .post("/v1/invoices")
      .set("Authorization", authHeader)
      .send({
        customerId: customer.id,
        currency: "TRY",
        taxRate: 0.20,
        lines: [
          { productId: "prd_monitor_27", quantity: 2, unitPrice: 200 },
        ],
      })
      .expect(201);

    expect(invoice.id).toBeDefined();
    expect(invoice.status).toBe("DRAFT");
    expect(invoice.subtotal).toBe(400);
    expect(invoice.taxAmount).toBe(80);
    expect(invoice.total).toBe(480);

    // 3. Record partial payment
    const { body: payment1 } = await request(app.getHttpServer())
      .post(`/v1/invoices/${invoice.id}/payments`)
      .set("Authorization", authHeader)
      .send({
        amount: 200,
        method: "BANK_TRANSFER",
        reference: "TR-12345",
      })
      .expect(201);

    expect(payment1.id).toBeDefined();

    // Verify invoice is partially paid
    const { body: invoicesList } = await request(app.getHttpServer())
      .get("/v1/invoices")
      .set("Authorization", authHeader)
      .expect(200);
    
    const updatedInvoice = invoicesList.find((i: any) => i.id === invoice.id);
    expect(updatedInvoice.status).toBe("PARTIALLY_PAID");

    // 4. Record full payment
    await request(app.getHttpServer())
      .post(`/v1/invoices/${invoice.id}/payments`)
      .set("Authorization", authHeader)
      .send({
        amount: 280,
        method: "CREDIT_CARD",
      })
      .expect(201);

    // Verify invoice is fully paid
    const { body: invoicesList2 } = await request(app.getHttpServer())
      .get("/v1/invoices")
      .set("Authorization", authHeader)
      .expect(200);
    
    const fullyPaidInvoice = invoicesList2.find((i: any) => i.id === invoice.id);
    expect(fullyPaidInvoice.status).toBe("PAID");

    // 5. Create Credit Note
    const { body: creditNote } = await request(app.getHttpServer())
      .post("/v1/credit-notes")
      .set("Authorization", authHeader)
      .send({
        customerId: customer.id,
        lines: [
          { productId: "prd_monitor_27", quantity: 1, unitPrice: 200 },
        ],
      })
      .expect(201);

    expect(creditNote.id).toBeDefined();
    expect(creditNote.totalAmount).toBe(200);
    expect(creditNote.status).toBe("ISSUED");
  });
});

describe("API production environment guardrails", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects demo mode and default demo token in production", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_DATA_SOURCE = "demo";
    process.env.API_CORS_ORIGIN = "https://app.stockops.example";
    process.env.SHOPIFY_WEBHOOK_SECRET = "shopify-secret";
    process.env.WOOCOMMERCE_WEBHOOK_SECRET = "woo-secret";

    expect(() => validateApiEnvironment()).toThrow(/APP_DATA_SOURCE=demo/);

    process.env.STOCKOPS_ALLOW_DEMO_IN_PRODUCTION = "true";
    expect(() => validateApiEnvironment()).toThrow(/default API demo token/);
  });

  it("requires explicit CORS and provider webhook secrets in production", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_DATA_SOURCE = "database";
    process.env.DATABASE_URL = "postgresql://stockops:stockops@localhost:5432/stockops";
    process.env.API_DEMO_TOKEN = "not-the-default-token";
    delete process.env.API_CORS_ORIGIN;

    expect(() => validateApiEnvironment()).toThrow(/API_CORS_ORIGIN/);

    process.env.API_CORS_ORIGIN = "https://app.stockops.example";
    expect(() => validateApiEnvironment()).toThrow(/webhook secrets/);

    process.env.SHOPIFY_WEBHOOK_SECRET = "shopify-secret";
    process.env.WOOCOMMERCE_WEBHOOK_SECRET = "woo-secret";
    expect(() => validateApiEnvironment()).not.toThrow();
  });
});
