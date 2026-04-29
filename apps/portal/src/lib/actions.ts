"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { portalSignIn, portalSignOut, requirePortalAuth } from "@/lib/auth";
import { portalSignInSchema, portalOrderInputSchema } from "@stockops/core/schemas";

export async function signInAction(formData: FormData) {
  const parsed = portalSignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/sign-in?error=invalid");
  }

  const ok = await portalSignIn(parsed.data.email, parsed.data.password);
  if (!ok) {
    redirect("/sign-in?error=invalid");
  }

  redirect("/");
}

export async function signOutAction() {
  await portalSignOut();
  redirect("/sign-in");
}

export type OrderActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function placeOrderAction(
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  try {
    await requirePortalAuth();

    const productIds = formData.getAll("productId") as string[];
    const quantities = formData.getAll("quantity") as string[];

    const lines = productIds
      .map((productId, i) => ({
        productId,
        quantity: Number(quantities[i] || 0),
      }))
      .filter((l) => l.quantity > 0);

    if (lines.length === 0) {
      return { status: "error", message: "En az bir ürün seçmelisiniz." };
    }

    // In production: create the order via repository
    // For demo: just validate and acknowledge
    const parsed = portalOrderInputSchema.safeParse({
      lines,
      notes: formData.get("notes") || undefined,
    });

    if (!parsed.success) {
      return { status: "error", message: "Sipariş bilgileri geçersiz." };
    }

    revalidatePath("/orders");
    return { status: "success", message: `${lines.length} kalem sipariş oluşturuldu.` };
  } catch {
    return { status: "error", message: "Sipariş oluşturulamadı." };
  }
}
