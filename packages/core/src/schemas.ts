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

export const webhookSourceSchema = z.enum(["SHOPIFY", "WOOCOMMERCE"]);
export const webhookEventStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "PROCESSED",
  "FAILED",
  "IGNORED",
]);

export const signInInputSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});
