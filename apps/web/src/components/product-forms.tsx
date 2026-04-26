"use client";

import { clsx } from "clsx";
import { Check, Pencil, Plus, Power } from "lucide-react";
import { ActionForm, submitClass } from "@/components/action-form";
import { BarcodeValueInput } from "@/components/barcode-value-input";
import { inputClass, subtleButtonClass } from "@/components/ui";
import {
  createProductAction,
  setProductActiveAction,
  updateProductAction,
} from "@/lib/actions";
import type { Product } from "@stockops/core/types";

export function ProductCreateForm() {
  return (
    <ActionForm action={createProductAction}>
      {(pending) => (
        <>
          <label className="grid gap-1.5 text-sm font-medium">
            SKU
            <input className={inputClass} name="sku" required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Ürün adı
            <input className={inputClass} name="name" required />
          </label>
          <BarcodeValueInput />
          <label className="grid gap-1.5 text-sm font-medium">
            Kategori
            <input className={inputClass} name="category" required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Minimum stok
            <input
              className={inputClass}
              min="0"
              name="minimumStock"
              required
              type="number"
            />
          </label>
          <button className={submitClass(pending)} disabled={pending} type="submit">
            <Plus aria-hidden="true" className="size-4" />
            {pending ? "Ekleniyor" : "Ürün ekle"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function ProductUpdateDisclosure({ product }: { product: Product }) {
  return (
    <details className="max-w-[520px]">
      <summary
        className={clsx(
          subtleButtonClass,
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        <Pencil aria-hidden="true" className="size-4" />
        Düzenle
      </summary>
      <div className="mt-3 rounded-md border border-[#e3e5dd] bg-[#fafbf7] p-3">
        <ProductUpdateForm product={product} />
      </div>
    </details>
  );
}

function ProductUpdateForm({ product }: { product: Product }) {
  return (
    <ActionForm action={updateProductAction} resetOnSuccess={false}>
      {(pending) => (
        <>
          <input name="productId" type="hidden" value={product.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              SKU
              <input
                className={inputClass}
                defaultValue={product.sku}
                name="sku"
                required
              />
            </label>
            <BarcodeValueInput defaultValue={product.barcode ?? ""} />
            <label className="grid gap-1.5 text-sm font-medium">
              Ürün adı
              <input
                className={inputClass}
                defaultValue={product.name}
                name="name"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Kategori
              <input
                className={inputClass}
                defaultValue={product.category}
                name="category"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Minimum stok
              <input
                className={inputClass}
                defaultValue={product.minimumStock}
                min="0"
                name="minimumStock"
                required
                type="number"
              />
            </label>
          </div>
          <button
            className={submitClass(pending, "subtle")}
            disabled={pending}
            type="submit"
          >
            <Check aria-hidden="true" className="size-4" />
            {pending ? "Kaydediliyor" : "Kaydet"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function ProductStatusForm({ product }: { product: Product }) {
  const nextActiveState = !product.isActive;

  return (
    <ActionForm
      action={setProductActiveAction}
      className="grid gap-2"
      resetOnSuccess={false}
    >
      {(pending) => (
        <>
          <input name="productId" type="hidden" value={product.id} />
          <input
            name="isActive"
            type="hidden"
            value={nextActiveState ? "true" : "false"}
          />
          <button
            className={submitClass(pending, "subtle")}
            disabled={pending}
            type="submit"
          >
            <Power aria-hidden="true" className="size-4" />
            {nextActiveState ? "Aktif yap" : "Pasif yap"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
