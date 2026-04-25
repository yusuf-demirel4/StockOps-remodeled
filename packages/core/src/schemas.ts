import { z } from "zod";

const positiveInt = z.coerce.number().int().positive();

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
