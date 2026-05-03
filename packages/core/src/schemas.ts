import { z } from "zod";

const positiveInt = z.coerce.number().int().positive();
const httpWebhookUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Webhook URL must use http or https.");
const optionalBoolean = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}, z.boolean().optional());

export const supportedCurrencySchema = z.enum([
  "TRY",
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "JPY",
]);

export const supportedLocaleSchema = z.enum(["tr", "en"]);

export const organizationSettingsInputSchema = z.object({
  defaultCurrency: supportedCurrencySchema,
  locale: supportedLocaleSchema,
});

export const productInputSchema = z.object({
  sku: z.string().trim().min(2),
  name: z.string().trim().min(2),
  barcode: z.string().trim().optional(),
  category: z.string().trim().min(2),
  minimumStock: z.coerce.number().int().min(0),
});

export const productUpdateInputSchema = productInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);

export const stockMovementInputSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  type: z.enum(["INBOUND", "OUTBOUND", "ADJUSTMENT"]),
  quantity: positiveInt,
  note: z.string().trim().optional(),
});

export const stocktakeCountInputSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  countedQuantity: z.coerce.number().int().min(0),
  note: z.string().trim().optional(),
});

export const stockTransferInputSchema = z
  .object({
    productId: z.string().min(1),
    sourceWarehouseId: z.string().min(1),
    destinationWarehouseId: z.string().min(1),
    quantity: positiveInt,
    note: z.string().trim().optional(),
  })
  .refine(
    (value) => value.sourceWarehouseId !== value.destinationWarehouseId,
    {
      message: "Source and destination warehouses must be different.",
      path: ["destinationWarehouseId"],
    },
  );

export const warehouseInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(80),
  isDefault: optionalBoolean,
});

export const warehouseUpdateInputSchema = warehouseInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);

export const supplierInputSchema = z.object({
  name: z.string().trim().min(2),
  contactName: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  leadTimeDays: z.coerce.number().int().min(1).max(90),
});

export const supplierUpdateInputSchema = supplierInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);

export const salesOrderInputSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().trim().min(2),
  lines: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: positiveInt,
    })
  ).min(1).optional(),
  productId: z.string().min(1).optional(),
  quantity: positiveInt.optional(),
});

export const purchaseOrderInputSchema = z.object({
  supplierId: z.string().min(1),
  productId: z.string().min(1),
  quantity: positiveInt,
  expectedDate: z.string().trim().optional(),
});

export const customerInputSchema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  address: z.string().trim().optional(),
  paymentTermDays: z.coerce.number().int().min(0).max(365).default(30),
});

export const customerUpdateInputSchema = customerInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);

export const invoiceInputSchema = z.object({
  customerId: z.string().min(1),
  dueDate: z.string().trim().optional(),
  taxRate: z.coerce.number().min(0).max(1).default(0),
  currency: z.string().trim().default("TRY"),
  notes: z.string().trim().optional(),
  lines: z.array(
    z.object({
      productId: z.string().min(1),
      description: z.string().trim().optional(),
      quantity: z.coerce.number().int().positive(),
      unitPrice: z.coerce.number().min(0),
      discount: z.coerce.number().min(0).max(100).default(0),
    }),
  ).min(1),
});

export const paymentInputSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  method: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "CHECK", "CREDIT_NOTE", "OTHER"]).default("BANK_TRANSFER"),
  reference: z.string().trim().optional(),
});

export const creditNoteInputSchema = z.object({
  customerId: z.string().min(1),
  salesReturnId: z.string().optional(),
  notes: z.string().trim().optional(),
  lines: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.coerce.number().int().positive(),
      unitPrice: z.coerce.number().min(0),
    }),
  ).min(1),
});

export const exchangeRateQuerySchema = z.object({
  baseCurrency: supportedCurrencySchema.default("EUR"),
  quoteCurrency: supportedCurrencySchema.default("TRY"),
  provider: z.enum(["ECB", "TCMB"]).optional(),
});

export const webhookSourceSchema = z.enum(["SHOPIFY", "WOOCOMMERCE"]);
export const webhookEventStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "PROCESSED",
  "FAILED",
  "IGNORED",
]);
export const notificationChannelSchema = z.enum(["SMS", "WHATSAPP"]);
export const notificationDeliveryStatusSchema = z.enum([
  "PENDING",
  "SENT",
  "FAILED",
  "SKIPPED",
]);

export const extensionEventNameSchema = z.enum([
  "order.created",
  "order.updated",
  "stock.changed",
  "invoice.issued",
  "product.updated",
  "purchase.received",
]);

export const webhookSubscriptionInputSchema = z.object({
  url: httpWebhookUrl,
  events: z.array(extensionEventNameSchema).min(1),
  secret: z.string().trim().min(12).optional().or(z.literal("")),
});

export const webhookSubscriptionUpdateSchema = z.object({
  url: httpWebhookUrl.optional(),
  events: z.array(extensionEventNameSchema).min(1).optional(),
  secret: z.string().trim().min(12).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
}).refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);

export const customFieldInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/),
  value: z.unknown(),
});

export const variantInputSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().trim().min(2),
  name: z.string().trim().min(2),
  barcode: z.string().trim().optional(),
  unitPrice: z.coerce.number().min(0).default(0),
  costPrice: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  attributes: z.string().trim().optional(),
});

export const variantUpdateInputSchema = variantInputSchema
  .omit({ productId: true })
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required.",
  );

export const salesReturnInputSchema = z.object({
  salesOrderId: z.string().min(1),
  reason: z.string().trim().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
});

export const userInputSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum([
    "Owner",
    "Admin",
    "WarehouseStaff",
    "SalesStaff",
    "PurchasingStaff",
    "Viewer",
  ]),
});

export const userUpdateRoleSchema = z.object({
  role: z.enum([
    "Owner",
    "Admin",
    "WarehouseStaff",
    "SalesStaff",
    "PurchasingStaff",
    "Viewer",
  ]),
});

export const signInInputSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

// ── BOM + Manufacturing ──

export const bomComponentInputSchema = z.object({
  componentProductId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const bomInputSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  components: z.array(bomComponentInputSchema).min(1),
});

export const bomUpdateInputSchema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().optional(),
  components: z.array(bomComponentInputSchema).min(1).optional(),
});

export const manufacturingOrderInputSchema = z.object({
  bomId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
});

// ── B2B Portal ──

export const customerUserInputSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export const customerPriceTierInputSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  tierPrice: z.coerce.number().min(0),
  minQuantity: z.coerce.number().int().positive().default(1),
});

export const portalOrderInputSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
  notes: z.string().trim().optional(),
});

export const portalSignInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export const brandingInputSchema = z.object({
  logoUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .or(z.literal("")),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .or(z.literal("")),
  portalDomain: z.string().trim().optional(),
});
