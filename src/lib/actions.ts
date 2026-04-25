"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth, signInWithPassword, signOut } from "@/lib/auth";
import {
  confirmSalesOrder,
  createProduct,
  createPurchaseOrder,
  createSalesOrder,
  createStockMovement,
  createSupplier,
  receivePurchaseOrder,
} from "@/lib/repository";
import { signInInputSchema } from "@/lib/schemas";

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item : "";
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/orders");
  revalidatePath("/suppliers");
  revalidatePath("/settings");
}

export async function signInAction(formData: FormData) {
  const parsed = signInInputSchema.safeParse({
    email: value(formData, "email"),
    password: value(formData, "password"),
  });

  if (!parsed.success) {
    redirect("/sign-in?error=invalid");
  }

  const signedIn = await signInWithPassword(
    parsed.data.email,
    parsed.data.password,
  );

  if (!signedIn) {
    redirect("/sign-in?error=invalid");
  }

  redirect("/");
}

export async function signOutAction() {
  await signOut();
  redirect("/sign-in");
}

export async function createProductAction(formData: FormData) {
  const context = await requireAuth();
  await createProduct(
    {
      sku: value(formData, "sku"),
      name: value(formData, "name"),
      barcode: value(formData, "barcode"),
      category: value(formData, "category"),
      minimumStock: value(formData, "minimumStock"),
    },
    context,
  );
  refresh();
}

export async function createStockMovementAction(formData: FormData) {
  const context = await requireAuth();
  await createStockMovement(
    {
      productId: value(formData, "productId"),
      warehouseId: value(formData, "warehouseId"),
      type: value(formData, "type"),
      quantity: value(formData, "quantity"),
      note: value(formData, "note"),
    },
    context,
  );
  refresh();
}

export async function createSupplierAction(formData: FormData) {
  const context = await requireAuth();
  await createSupplier(
    {
      name: value(formData, "name"),
      contactName: value(formData, "contactName"),
      email: value(formData, "email"),
      phone: value(formData, "phone"),
      leadTimeDays: value(formData, "leadTimeDays"),
    },
    context,
  );
  refresh();
}

export async function createSalesOrderAction(formData: FormData) {
  const context = await requireAuth();
  await createSalesOrder(
    {
      customerName: value(formData, "customerName"),
      productId: value(formData, "productId"),
      quantity: value(formData, "quantity"),
    },
    context,
  );
  refresh();
}

export async function confirmSalesOrderAction(formData: FormData) {
  const context = await requireAuth();
  await confirmSalesOrder(value(formData, "orderId"), context);
  refresh();
}

export async function createPurchaseOrderAction(formData: FormData) {
  const context = await requireAuth();
  await createPurchaseOrder(
    {
      supplierId: value(formData, "supplierId"),
      productId: value(formData, "productId"),
      quantity: value(formData, "quantity"),
      expectedDate: value(formData, "expectedDate"),
    },
    context,
  );
  refresh();
}

export async function receivePurchaseOrderAction(formData: FormData) {
  const context = await requireAuth();
  await receivePurchaseOrder(value(formData, "orderId"), context);
  refresh();
}
