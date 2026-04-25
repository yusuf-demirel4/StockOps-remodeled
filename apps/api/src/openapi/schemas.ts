import type { OpenAPIObject } from "@nestjs/swagger";

type SchemaObject = NonNullable<
  NonNullable<OpenAPIObject["components"]>["schemas"]
>[string];

const isoDateTime = (example: string): SchemaObject => ({
  type: "string",
  format: "date-time",
  example,
});

const id = (example: string): SchemaObject => ({
  type: "string",
  example,
});

const nullableString = (example: string): SchemaObject => ({
  type: "string",
  nullable: true,
  example,
});

export const errorResponseSchema: SchemaObject = {
  type: "object",
  required: ["statusCode", "message"],
  properties: {
    statusCode: { type: "number", example: 400 },
    message: {
      oneOf: [
        { type: "string" },
        { type: "array", items: { type: "string" } },
        { type: "object", additionalProperties: true },
      ],
      example: "Validation failed",
    },
    error: { type: "string", example: "Bad Request" },
  },
};

export const roleSchema: SchemaObject = {
  type: "string",
  enum: [
    "Owner",
    "Admin",
    "WarehouseStaff",
    "SalesStaff",
    "PurchasingStaff",
    "Viewer",
  ],
  example: "Owner",
};

export const healthResponseSchema: SchemaObject = {
  type: "object",
  required: ["service", "status", "version"],
  properties: {
    service: { type: "string", example: "stockops-api" },
    status: { type: "string", example: "ok" },
    version: { type: "string", example: "0.1.0" },
  },
};

export const authMeResponseSchema: SchemaObject = {
  type: "object",
  required: ["user", "organization", "role"],
  properties: {
    user: {
      type: "object",
      required: ["id", "name", "email"],
      properties: {
        id: id("usr_owner"),
        name: { type: "string", example: "Eren Aksoy" },
        email: { type: "string", format: "email", example: "eren@example.com" },
      },
    },
    organization: {
      type: "object",
      required: ["id", "name", "slug"],
      properties: {
        id: id("org_kernelguard"),
        name: { type: "string", example: "KernelGuard" },
        slug: { type: "string", example: "kernelguard" },
      },
    },
    role: roleSchema,
  },
};

export const productSchema: SchemaObject = {
  type: "object",
  required: [
    "id",
    "organizationId",
    "sku",
    "name",
    "category",
    "minimumStock",
    "isActive",
  ],
  properties: {
    id: id("prd_001"),
    organizationId: id("org_kernelguard"),
    sku: { type: "string", example: "SKU-001" },
    name: { type: "string", example: "USB-C Cable" },
    barcode: nullableString("8690000000012"),
    category: { type: "string", example: "Accessories" },
    description: nullableString("Braided USB-C cable"),
    minimumStock: { type: "integer", minimum: 0, example: 25 },
    isActive: { type: "boolean", example: true },
  },
};

export const productListItemSchema: SchemaObject = {
  allOf: [
    productSchema,
    {
      type: "object",
      required: ["totalOnHand"],
      properties: {
        totalOnHand: { type: "integer", example: 140 },
      },
    },
  ],
};

export const productCreateBodySchema: SchemaObject = {
  type: "object",
  additionalProperties: false,
  required: ["sku", "name", "category", "minimumStock"],
  properties: {
    sku: { type: "string", minLength: 2, example: "SKU-001" },
    name: { type: "string", minLength: 2, example: "USB-C Cable" },
    barcode: { type: "string", example: "8690000000012" },
    category: { type: "string", minLength: 2, example: "Accessories" },
    minimumStock: { type: "integer", minimum: 0, example: 25 },
  },
};

export const productUpdateBodySchema: SchemaObject = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: productCreateBodySchema.properties,
};

export const supplierSchema: SchemaObject = {
  type: "object",
  required: ["id", "organizationId", "name", "leadTimeDays", "productIds"],
  properties: {
    id: id("sup_001"),
    organizationId: id("org_kernelguard"),
    name: { type: "string", example: "Acme Supply" },
    contactName: nullableString("Jane Smith"),
    email: nullableString("purchasing@acme.example"),
    phone: nullableString("+1 555 0100"),
    leadTimeDays: { type: "integer", minimum: 1, maximum: 90, example: 14 },
    productIds: {
      type: "array",
      items: id("prd_001"),
      example: ["prd_001"],
    },
  },
};

export const supplierCreateBodySchema: SchemaObject = {
  type: "object",
  additionalProperties: false,
  required: ["name", "leadTimeDays"],
  properties: {
    name: { type: "string", minLength: 2, example: "Acme Supply" },
    contactName: { type: "string", example: "Jane Smith" },
    email: { type: "string", format: "email", example: "purchasing@acme.example" },
    phone: { type: "string", example: "+1 555 0100" },
    leadTimeDays: { type: "integer", minimum: 1, maximum: 90, example: 14 },
  },
};

export const supplierUpdateBodySchema: SchemaObject = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: supplierCreateBodySchema.properties,
};

export const warehouseSchema: SchemaObject = {
  type: "object",
  required: ["id", "organizationId", "code", "name", "isDefault"],
  properties: {
    id: id("wh_main"),
    organizationId: id("org_kernelguard"),
    code: { type: "string", example: "MAIN" },
    name: { type: "string", example: "Main Warehouse" },
    isDefault: { type: "boolean", example: true },
  },
};

export const stockMovementResponseSchema: SchemaObject = {
  type: "object",
  required: [
    "id",
    "organizationId",
    "warehouseId",
    "productId",
    "type",
    "quantityChange",
    "createdAt",
  ],
  properties: {
    id: id("mov_001"),
    organizationId: id("org_kernelguard"),
    warehouseId: id("wh_main"),
    productId: id("prd_001"),
    type: {
      type: "string",
      enum: [
        "INBOUND",
        "OUTBOUND",
        "ADJUSTMENT",
        "SALE",
        "PURCHASE_RECEIPT",
        "TRANSFER",
      ],
      example: "INBOUND",
    },
    quantityChange: { type: "integer", example: 20 },
    reference: nullableString("PO-1001"),
    note: nullableString("Initial receiving"),
    createdById: nullableString("usr_owner"),
    createdAt: isoDateTime("2026-04-25T12:00:00.000Z"),
  },
};

export const stockMovementCreateBodySchema: SchemaObject = {
  type: "object",
  additionalProperties: false,
  required: ["productId", "warehouseId", "type", "quantity"],
  properties: {
    productId: id("prd_001"),
    warehouseId: id("wh_main"),
    type: {
      type: "string",
      enum: ["INBOUND", "OUTBOUND", "ADJUSTMENT"],
      example: "INBOUND",
    },
    quantity: { type: "integer", minimum: 1, example: 20 },
    note: { type: "string", example: "Cycle count adjustment" },
  },
};

export const stockRowSchema: SchemaObject = {
  type: "object",
  required: ["product", "warehouse", "onHand", "minimumStock", "isCritical"],
  properties: {
    product: productSchema,
    warehouse: warehouseSchema,
    onHand: { type: "integer", example: 18 },
    minimumStock: { type: "integer", example: 25 },
    isCritical: { type: "boolean", example: true },
  },
};

export const salesOrderSchema: SchemaObject = {
  type: "object",
  required: ["id", "organizationId", "code", "customerName", "status", "lines", "createdAt"],
  properties: {
    id: id("so_001"),
    organizationId: id("org_kernelguard"),
    code: { type: "string", example: "SO-1001" },
    customerName: { type: "string", example: "Northwind Traders" },
    status: {
      type: "string",
      enum: ["DRAFT", "CONFIRMED", "CANCELLED"],
      example: "DRAFT",
    },
    lines: {
      type: "array",
      items: {
        type: "object",
        required: ["productId", "quantity"],
        properties: {
          productId: id("prd_001"),
          quantity: { type: "integer", minimum: 1, example: 3 },
        },
      },
    },
    createdAt: isoDateTime("2026-04-25T12:00:00.000Z"),
  },
};

export const salesOrderCreateBodySchema: SchemaObject = {
  type: "object",
  additionalProperties: false,
  required: ["customerName", "productId", "quantity"],
  properties: {
    customerName: { type: "string", minLength: 2, example: "Northwind Traders" },
    productId: id("prd_001"),
    quantity: { type: "integer", minimum: 1, example: 3 },
  },
};

export const purchaseOrderSchema: SchemaObject = {
  type: "object",
  required: ["id", "organizationId", "supplierId", "code", "status", "lines", "createdAt"],
  properties: {
    id: id("po_001"),
    organizationId: id("org_kernelguard"),
    supplierId: id("sup_001"),
    code: { type: "string", example: "PO-1001" },
    status: {
      type: "string",
      enum: ["DRAFT", "SENT", "PARTIALLY_RECEIVED", "COMPLETED", "CANCELLED"],
      example: "SENT",
    },
    expectedDate: {
      type: "string",
      format: "date",
      nullable: true,
      example: "2026-05-05",
    },
    lines: {
      type: "array",
      items: {
        type: "object",
        required: ["productId", "quantity", "receivedQuantity"],
        properties: {
          productId: id("prd_001"),
          quantity: { type: "integer", minimum: 1, example: 40 },
          receivedQuantity: { type: "integer", minimum: 0, example: 0 },
        },
      },
    },
    createdAt: isoDateTime("2026-04-25T12:00:00.000Z"),
  },
};

export const purchaseOrderCreateBodySchema: SchemaObject = {
  type: "object",
  additionalProperties: false,
  required: ["supplierId", "productId", "quantity"],
  properties: {
    supplierId: id("sup_001"),
    productId: id("prd_001"),
    quantity: { type: "integer", minimum: 1, example: 40 },
    expectedDate: { type: "string", format: "date", example: "2026-05-05" },
  },
};

export const webhookPayloadBodySchema: SchemaObject = {
  type: "object",
  additionalProperties: true,
  example: {
    id: "gid://shopify/Product/123",
    title: "USB-C Cable",
    variants: [{ sku: "SKU-001", inventory_quantity: 140 }],
  },
};

export const webhookAcceptedResponseSchema: SchemaObject = {
  type: "object",
  required: [
    "accepted",
    "duplicate",
    "id",
    "organizationId",
    "source",
    "topic",
    "queued",
    "job",
    "queue",
    "receivedAt",
  ],
  properties: {
    accepted: { type: "boolean", example: true },
    duplicate: { type: "boolean", example: false },
    id: id("wh_001"),
    organizationId: id("org_kernelguard"),
    source: { type: "string", enum: ["shopify", "woocommerce"], example: "shopify" },
    topic: { type: "string", example: "products/update" },
    queued: { type: "boolean", example: true },
    job: {
      type: "object",
      required: ["name", "payload"],
      properties: {
        name: { type: "string", example: "shopify.webhook.received" },
        payload: {
          type: "object",
          required: ["webhookEventId", "organizationId", "source", "topic"],
          properties: {
            webhookEventId: id("wh_001"),
            organizationId: id("org_kernelguard"),
            source: { type: "string", enum: ["SHOPIFY", "WOOCOMMERCE"], example: "SHOPIFY" },
            topic: { type: "string", example: "products/update" },
          },
        },
      },
    },
    queue: {
      type: "object",
      required: [],
      properties: {
        driver: { type: "string", enum: ["memory", "bullmq"], example: "memory" },
        jobId: id("wh_001"),
        name: { type: "string", example: "stockops.jobs" },
        reason: { type: "string", example: "duplicate-webhook-event" },
        skipped: { type: "boolean", example: false },
      },
    },
    receivedAt: isoDateTime("2026-04-25T12:00:00.000Z"),
  },
};

export function arrayOf(items: SchemaObject): SchemaObject {
  return {
    type: "array",
    items,
  };
}
