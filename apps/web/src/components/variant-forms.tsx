"use client";

import { clsx } from "clsx";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { ActionForm, submitClass } from "@/components/action-form";
import {
  EmptyState,
  inputClass,
  StatusBadge,
  subtleButtonClass,
} from "@/components/ui";
import {
  createVariantAction,
  deleteVariantAction,
  updateVariantAction,
} from "@/lib/actions";
import type { Product, ProductVariant } from "@stockops/core/types";

function attributesPreview(attributes: Record<string, string>) {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return "-";
  return entries.map(([key, value]) => `${key}: ${value}`).join(" • ");
}

function attributesAsJson(attributes: Record<string, string>) {
  if (!attributes || Object.keys(attributes).length === 0) return "";
  return JSON.stringify(attributes);
}

export function VariantManager({
  product,
  variants,
}: {
  product: Product;
  variants: ProductVariant[];
}) {
  const productVariants = variants.filter((v) => v.productId === product.id);

  return (
    <details className="max-w-[860px]">
      <summary
        className={clsx(
          subtleButtonClass,
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        <Layers aria-hidden="true" className="size-4" />
        Varyantlar ({productVariants.length})
      </summary>
      <div className="mt-3 grid gap-4 rounded-md border border-[#e3e5dd] bg-[#fafbf7] p-4">
        <VariantCreateForm productId={product.id} />

        {productVariants.length === 0 ? (
          <EmptyState>Henüz varyant tanımlanmamış.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-[#6a746f]">
                <tr className="border-b border-[#e3e5dd]">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Ad</th>
                  <th className="py-2 pr-3">Özellikler</th>
                  <th className="py-2 pr-3">Fiyat</th>
                  <th className="py-2 pr-3">Durum</th>
                  <th className="py-2">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {productVariants.map((variant) => (
                  <tr
                    className="border-b border-[#eef0ea] align-top last:border-0"
                    key={variant.id}
                  >
                    <td className="py-3 pr-3 font-mono text-xs">
                      {variant.sku}
                    </td>
                    <td className="py-3 pr-3 font-medium">{variant.name}</td>
                    <td className="py-3 pr-3 text-xs text-[#52605a]">
                      {attributesPreview(variant.attributes)}
                    </td>
                    <td className="py-3 pr-3">
                      {variant.unitPrice.toLocaleString("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      })}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge tone={variant.isActive ? "success" : "danger"}>
                        {variant.isActive ? "Aktif" : "Pasif"}
                      </StatusBadge>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-start gap-2">
                        <VariantUpdateDisclosure variant={variant} />
                        <VariantDeleteForm variant={variant} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}

function VariantCreateForm({ productId }: { productId: string }) {
  return (
    <ActionForm action={createVariantAction}>
      {(pending) => (
        <>
          <input name="productId" type="hidden" value={productId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Varyant SKU
              <input
                className={inputClass}
                name="sku"
                placeholder="SKU-001-RED-XL"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Varyant adı
              <input
                className={inputClass}
                name="name"
                placeholder="Kırmızı / XL"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Barkod
              <input className={inputClass} name="barcode" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Birim fiyat
              <input
                className={inputClass}
                min="0"
                name="unitPrice"
                step="0.01"
                type="number"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Maliyet
              <input
                className={inputClass}
                min="0"
                name="costPrice"
                step="0.01"
                type="number"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Ağırlık (kg)
              <input
                className={inputClass}
                min="0"
                name="weight"
                step="0.001"
                type="number"
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            Özellikler (JSON)
            <input
              className={inputClass}
              name="attributes"
              placeholder='{"Renk":"Kırmızı","Beden":"XL"}'
            />
          </label>
          <button
            className={submitClass(pending)}
            disabled={pending}
            type="submit"
          >
            <Plus aria-hidden="true" className="size-4" />
            {pending ? "Ekleniyor" : "Varyant ekle"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

function VariantUpdateDisclosure({ variant }: { variant: ProductVariant }) {
  return (
    <details>
      <summary
        className={clsx(
          subtleButtonClass,
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        <Pencil aria-hidden="true" className="size-4" />
        Düzenle
      </summary>
      <div className="mt-3 rounded-md border border-[#e3e5dd] bg-white p-3">
        <VariantUpdateForm variant={variant} />
      </div>
    </details>
  );
}

function VariantUpdateForm({ variant }: { variant: ProductVariant }) {
  return (
    <ActionForm action={updateVariantAction} resetOnSuccess={false}>
      {(pending) => (
        <>
          <input name="variantId" type="hidden" value={variant.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              SKU
              <input
                className={inputClass}
                defaultValue={variant.sku}
                name="sku"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Ad
              <input
                className={inputClass}
                defaultValue={variant.name}
                name="name"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Barkod
              <input
                className={inputClass}
                defaultValue={variant.barcode ?? ""}
                name="barcode"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Birim fiyat
              <input
                className={inputClass}
                defaultValue={variant.unitPrice}
                min="0"
                name="unitPrice"
                step="0.01"
                type="number"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Maliyet
              <input
                className={inputClass}
                defaultValue={variant.costPrice ?? ""}
                min="0"
                name="costPrice"
                step="0.01"
                type="number"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Ağırlık (kg)
              <input
                className={inputClass}
                defaultValue={variant.weight ?? ""}
                min="0"
                name="weight"
                step="0.001"
                type="number"
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            Özellikler (JSON)
            <input
              className={inputClass}
              defaultValue={attributesAsJson(variant.attributes)}
              name="attributes"
            />
          </label>
          <button
            className={submitClass(pending, "subtle")}
            disabled={pending}
            type="submit"
          >
            {pending ? "Kaydediliyor" : "Kaydet"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

function VariantDeleteForm({ variant }: { variant: ProductVariant }) {
  return (
    <ActionForm
      action={deleteVariantAction}
      className="grid gap-2"
      resetOnSuccess={false}
    >
      {(pending) => (
        <>
          <input name="variantId" type="hidden" value={variant.id} />
          <button
            className={submitClass(pending, "subtle")}
            disabled={pending}
            type="submit"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {pending ? "Siliniyor" : "Sil"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
