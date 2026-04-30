"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { requireAuth, signInWithPassword, signOut } from "@/lib/auth";
import {
  approveSalesReturn,
  confirmSalesOrder,
  createProduct,
  createPurchaseOrder,
  createSalesOrder,
  createSalesReturn,
  createStockMovement,
  createStockTransfer,
  createWebhookSubscription,
  createSupplier,
  createUser,
  createVariant,
  createWarehouse,
  
  deleteVariant,
  receivePurchaseOrder,
  recordStocktakeCount,
  refreshExchangeRates,
  setProductActive,
  updateOrganizationSettings,
  updateProduct,
  updateSupplier,
  updateUserRole,
  updateVariant,
  updateWarehouse,
  updateWebhookSubscription,
  upsertCustomField,
} from "@/lib/repository";
import { signInInputSchema } from "@stockops/core/schemas";
import type { AuthContext } from "@stockops/core/types";
import { ZodError } from "zod";

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item : "";
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/manufacturing");
  revalidatePath("/orders");
  revalidatePath("/suppliers");
  revalidatePath("/users");
  revalidatePath("/settings");
  revalidatePath("/mobile");
  revalidatePath("/mobile/receive");
  revalidatePath("/mobile/pick");
  revalidatePath("/mobile/stocktake");
}

function success(message: string): ActionState {
  return {
    actionId: Date.now(),
    message,
    status: "success",
  };
}

function failure(error: unknown): ActionState {
  return {
    actionId: Date.now(),
    message: actionErrorMessage(error),
    status: "error",
  };
}

function actionErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return "Form alanlarını kontrol edin. Zorunlu alanlar veya sayı değerleri geçersiz.";
  }

  if (!(error instanceof Error)) {
    return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
  }

  if (error.message.startsWith("Insufficient stock")) {
    return "Yetersiz stok. Çıkış miktarı eldeki stoktan büyük.";
  }

  if (
    error.message.includes("SKU already") ||
    error.message.includes("Unique constraint") ||
    error.message.includes("zaten")
  ) {
    return "Bu kayıt zaten mevcut. Benzersiz alanları kontrol edin.";
  }

  if (
    error.message.includes("not found") ||
    error.message.includes("bulunamadi") ||
    error.message.includes("bulunamad")
  ) {
    return "Kayıt bulunamadı veya artık güncel değil.";
  }

  return error.message || "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

async function runMutation(
  successMessage: string,
  mutation: (context: AuthContext) => Promise<unknown>,
) {
  const context = await requireAuth();

  try {
    await mutation(context);
    refresh();
    return success(successMessage);
  } catch (error) {
    return failure(error);
  }
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

export async function createProductAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Ürün eklendi.", (context) =>
    createProduct(
      {
        sku: value(formData, "sku"),
        name: value(formData, "name"),
        barcode: value(formData, "barcode"),
        category: value(formData, "category"),
        minimumStock: value(formData, "minimumStock"),
      },
      context,
    ),
  );
}

export async function updateProductAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Ürün güncellendi.", (context) =>
    updateProduct(
      value(formData, "productId"),
      {
        sku: value(formData, "sku"),
        name: value(formData, "name"),
        barcode: value(formData, "barcode"),
        category: value(formData, "category"),
        minimumStock: value(formData, "minimumStock"),
      },
      context,
    ),
  );
}

export async function setProductActiveAction(
  _previousState: ActionState,
  formData: FormData,
) {
  const isActive = value(formData, "isActive") === "true";

  return runMutation(
    isActive ? "Ürün aktif hale getirildi." : "Ürün pasif hale getirildi.",
    (context) => setProductActive(value(formData, "productId"), isActive, context),
  );
}

export async function createStockMovementAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Stok hareketi kaydedildi.", (context) =>
    createStockMovement(
      {
        productId: value(formData, "productId"),
        warehouseId: value(formData, "warehouseId"),
        type: value(formData, "type"),
        quantity: value(formData, "quantity"),
        note: value(formData, "note"),
      },
      context,
    ),
  );
}

export async function recordStocktakeAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Sayim kaydi islendi.", (context) =>
    recordStocktakeCount(
      {
        productId: value(formData, "productId"),
        warehouseId: value(formData, "warehouseId"),
        countedQuantity: value(formData, "countedQuantity"),
        note: value(formData, "note"),
      },
      context,
    ),
  );
}

export async function createStockTransferAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Stok transferi oluşturuldu.", (context) =>
    createStockTransfer(
      {
        productId: value(formData, "productId"),
        sourceWarehouseId: value(formData, "sourceWarehouseId"),
        destinationWarehouseId: value(formData, "destinationWarehouseId"),
        quantity: value(formData, "quantity"),
        note: value(formData, "note"),
      },
      context,
    ),
  );
}

export async function createWarehouseAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Depo eklendi.", (context) =>
    createWarehouse(
      {
        code: value(formData, "code"),
        name: value(formData, "name"),
        isDefault: value(formData, "isDefault") === "true",
      },
      context,
    ),
  );
}

export async function updateWarehouseAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Depo güncellendi.", (context) =>
    updateWarehouse(
      value(formData, "warehouseId"),
      {
        code: value(formData, "code"),
        name: value(formData, "name"),
        isDefault: value(formData, "isDefault") === "true" ? true : undefined,
      },
      context,
    ),
  );
}

export async function createSupplierAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Tedarikçi eklendi.", (context) =>
    createSupplier(
      {
        name: value(formData, "name"),
        contactName: value(formData, "contactName"),
        email: value(formData, "email"),
        phone: value(formData, "phone"),
        leadTimeDays: value(formData, "leadTimeDays"),
      },
      context,
    ),
  );
}

export async function updateSupplierAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Tedarikçi güncellendi.", (context) =>
    updateSupplier(
      value(formData, "supplierId"),
      {
        name: value(formData, "name"),
        contactName: value(formData, "contactName"),
        email: value(formData, "email"),
        phone: value(formData, "phone"),
        leadTimeDays: value(formData, "leadTimeDays"),
      },
      context,
    ),
  );
}

export async function createSalesOrderAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Satış siparişi oluşturuldu.", (context) =>
    createSalesOrder(
      {
        customerName: value(formData, "customerName"),
        productId: value(formData, "productId"),
        quantity: value(formData, "quantity"),
      },
      context,
    ),
  );
}

export async function confirmSalesOrderAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Satış siparişi onaylandı.", (context) =>
    confirmSalesOrder(value(formData, "orderId"), context),
  );
}

export async function createPurchaseOrderAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Satın alma siparişi oluşturuldu.", (context) =>
    createPurchaseOrder(
      {
        supplierId: value(formData, "supplierId"),
        productId: value(formData, "productId"),
        quantity: value(formData, "quantity"),
        expectedDate: value(formData, "expectedDate"),
      },
      context,
    ),
  );
}

export async function receivePurchaseOrderAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Satın alma teslim alındı.", (context) =>
    receivePurchaseOrder(value(formData, "orderId"), context),
  );
}

export async function createVariantAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Varyant eklendi.", (context) =>
    createVariant(
      {
        productId: value(formData, "productId"),
        sku: value(formData, "sku"),
        name: value(formData, "name"),
        barcode: value(formData, "barcode"),
        unitPrice: value(formData, "unitPrice"),
        costPrice: value(formData, "costPrice"),
        weight: value(formData, "weight"),
        attributes: value(formData, "attributes"),
      },
      context,
    ),
  );
}

export async function updateVariantAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Varyant güncellendi.", (context) =>
    updateVariant(
      value(formData, "variantId"),
      {
        sku: value(formData, "sku"),
        name: value(formData, "name"),
        barcode: value(formData, "barcode"),
        unitPrice: value(formData, "unitPrice"),
        costPrice: value(formData, "costPrice"),
        weight: value(formData, "weight"),
        attributes: value(formData, "attributes"),
      },
      context,
    ),
  );
}

export async function deleteVariantAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Varyant silindi.", (context) =>
    deleteVariant(value(formData, "variantId"), context),
  );
}

export async function createSalesReturnAction(
  _previousState: ActionState,
  formData: FormData,
) {
  const productIds = formData.getAll("productId") as string[];
  const quantities = formData.getAll("quantity") as string[];

  const lines = productIds
    .map((productId, i) => ({
      productId,
      quantity: quantities[i],
    }))
    .filter((line) => Number(line.quantity) > 0);

  return runMutation("İade talebi oluşturuldu.", (context) =>
    createSalesReturn(
      {
        salesOrderId: value(formData, "salesOrderId"),
        reason: value(formData, "reason"),
        lines,
      },
      context,
    ),
  );
}

export async function approveSalesReturnAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("İade onaylandı, stok iade edildi.", (context) =>
    approveSalesReturn(value(formData, "returnId"), context),
  );
}

export async function createUserAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Kullanıcı eklendi.", (context) =>
    createUser(
      {
        name: value(formData, "name"),
        email: value(formData, "email"),
        password: value(formData, "password"),
        role: value(formData, "role"),
      },
      context,
    ),
  );
}

export async function updateOrganizationSettingsAction(
  _previousState: ActionState,
  formData: FormData,
) {
  const result = await runMutation("Isletme ayarlari guncellendi.", (context) =>
    updateOrganizationSettings(
      {
        defaultCurrency: value(formData, "defaultCurrency"),
        locale: value(formData, "locale"),
      },
      context,
    ),
  );

  if (result.status === "success") {
    const cookieStore = await cookies();
    cookieStore.set("stockops_locale", value(formData, "locale"), {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return result;
}

export async function refreshExchangeRatesAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Kur bilgisi guncellendi.", (context) =>
    refreshExchangeRates(
      {
        baseCurrency: value(formData, "baseCurrency"),
        quoteCurrency: value(formData, "quoteCurrency"),
        provider: value(formData, "provider") || undefined,
      },
      context,
    ),
  );
}

export async function createWebhookSubscriptionAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Webhook aboneligi olusturuldu.", (context) =>
    createWebhookSubscription(
      {
        url: value(formData, "url"),
        events: formData
          .getAll("events")
          .filter((item): item is string => typeof item === "string" && item.length > 0),
        secret: value(formData, "secret"),
      },
      context,
    ),
  );
}

export async function updateWebhookSubscriptionAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Webhook aboneligi guncellendi.", (context) =>
    updateWebhookSubscription(
      value(formData, "subscriptionId"),
      {
        status: value(formData, "status"),
      },
      context,
    ),
  );
}

export async function upsertCustomFieldAction(
  _previousState: ActionState,
  formData: FormData,
) {
  let parsedValue: unknown = value(formData, "value");

  try {
    parsedValue = JSON.parse(value(formData, "value"));
  } catch {
    // Plain strings are valid custom field values.
  }

  return runMutation("Ozel alan kaydedildi.", (context) =>
    upsertCustomField(
      value(formData, "entityType"),
      value(formData, "entityId"),
      {
        key: value(formData, "key"),
        value: parsedValue,
      },
      context,
    ),
  );
}

export async function updateUserRoleAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Kullanıcı rolü güncellendi.", (context) =>
    updateUserRole(
      value(formData, "membershipId"),
      { role: value(formData, "role") },
      context,
    ),
  );
}

export async function deleteUserAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Kullanıcı çıkarıldı.", (context) =>
    import("@/lib/repository").then((m) =>
      m.deleteUser(value(formData, "membershipId"), context)
    )
  );
}

export async function startPickingAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Toplama işlemi başlatıldı.", (context) =>
    import("@/lib/repository").then((m) =>
      m.startPicking(value(formData, "orderId"), context)
    )
  );
}

export async function updatePickListItemAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Miktar güncellendi.", (context) =>
    import("@/lib/repository").then((m) =>
      m.updatePickListItem(
        value(formData, "pickListId"),
        value(formData, "itemId"),
        parseInt(value(formData, "pickedQty") || "0", 10),
        context
      )
    )
  );
}

export async function markPackedAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Sipariş paketlendi.", (context) =>
    import("@/lib/repository").then((m) =>
      m.packOrder(value(formData, "orderId"), context)
    )
  );
}

export async function shipOrderAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Sipariş kargoya verildi.", (context) =>
    import("@/lib/repository").then((m) =>
      m.shipOrder(
        value(formData, "orderId"),
        {
          carrier: value(formData, "carrier") || undefined,
          trackingNumber: value(formData, "trackingNumber") || undefined,
          weight: parseFloat(value(formData, "weight") || "0") || undefined,
          packageCount: parseInt(value(formData, "packageCount") || "1", 10),
        },
        context
      )
    )
  );
}

export async function deliverOrderAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Sipariş teslim edildi.", (context) =>
    import("@/lib/repository").then((m) =>
      m.deliverOrder(value(formData, "orderId"), context)
    )
  );
}

// ── BOM + Manufacturing ──

export async function createBomAction(
  _previousState: ActionState,
  formData: FormData,
) {
  const componentProductIds = formData.getAll("componentProductId") as string[];
  const quantities = formData.getAll("componentQuantity") as string[];

  const components = componentProductIds
    .map((productId, i) => ({
      componentProductId: productId,
      quantity: quantities[i],
      sortOrder: i,
    }))
    .filter((c) => c.componentProductId && Number(c.quantity) > 0);

  return runMutation("Ürün reçetesi oluşturuldu.", (context) =>
    import("@/lib/repository").then((m) =>
      m.createBom(
        {
          productId: value(formData, "productId"),
          name: value(formData, "name"),
          description: value(formData, "description"),
          components,
        },
        context,
      )
    )
  );
}

export async function updateBomAction(
  _previousState: ActionState,
  formData: FormData,
) {
  const componentProductIds = formData.getAll("componentProductId") as string[];
  const quantities = formData.getAll("componentQuantity") as string[];

  const components = componentProductIds
    .map((productId, i) => ({
      componentProductId: productId,
      quantity: quantities[i],
      sortOrder: i,
    }))
    .filter((c) => c.componentProductId && Number(c.quantity) > 0);

  return runMutation("Reçete güncellendi.", (context) =>
    import("@/lib/repository").then((m) =>
      m.updateBom(
        value(formData, "bomId"),
        {
          name: value(formData, "name") || undefined,
          description: value(formData, "description"),
          components: components.length > 0 ? components : undefined,
        },
        context,
      )
    )
  );
}

export async function createManufacturingOrderAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Üretim emri oluşturuldu.", (context) =>
    import("@/lib/repository").then((m) =>
      m.createManufacturingOrder(
        {
          bomId: value(formData, "bomId"),
          warehouseId: value(formData, "warehouseId"),
          quantity: value(formData, "quantity"),
        },
        context,
      )
    )
  );
}

export async function startManufacturingOrderAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Üretim başlatıldı, hammaddeler tüketildi.", (context) =>
    import("@/lib/repository").then((m) =>
      m.startManufacturingOrder(value(formData, "moId"), context)
    )
  );
}

export async function completeManufacturingOrderAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return runMutation("Üretim tamamlandı, mamul stoka eklendi.", (context) =>
    import("@/lib/repository").then((m) =>
      m.completeManufacturingOrder(value(formData, "moId"), context)
    )
  );
}

export async function generateSmartPurchaseOrdersAction(
  _previousState: ActionState,
  formData: FormData,
) {
  const suggestionsRaw = value(formData, "suggestions");
  if (!suggestionsRaw) return failure(new Error("Öneriler bulunamadı."));

  try {
    const suggestions = JSON.parse(suggestionsRaw);
    return runMutation("Önerilen satınalma siparişleri oluşturuldu.", (context) =>
      import("@/lib/repository").then((m) =>
        m.generateSmartPurchaseOrders(suggestions, context)
      )
    );
  } catch (error) {
    return failure(error);
  }
}

