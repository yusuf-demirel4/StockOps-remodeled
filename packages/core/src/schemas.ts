import { z } from "zod";

const positiveInt = z.coerce.number().int().positive();
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
  customerName: z.string().trim().min(2),
  productId: z.string().min(1),
  quantity: positiveInt,
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
