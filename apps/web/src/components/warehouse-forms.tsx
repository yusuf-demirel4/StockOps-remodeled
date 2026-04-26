"use client";

import { clsx } from "clsx";
import { Check, Pencil, Plus, Star } from "lucide-react";
import { ActionForm, submitClass } from "@/components/action-form";
import { inputClass, subtleButtonClass } from "@/components/ui";
import {
  createWarehouseAction,
  updateWarehouseAction,
} from "@/lib/actions";
import type { Warehouse } from "@stockops/core/types";

export function WarehouseCreateForm() {
  return (
    <ActionForm action={createWarehouseAction}>
      {(pending) => (
        <>
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <label className="grid gap-1.5 text-sm font-medium">
              Kod
              <input className={inputClass} maxLength={16} name="code" required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Depo adı
              <input className={inputClass} name="name" required />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              className="size-4 rounded border-[#cfd3c8] accent-[#236d5a]"
              name="isDefault"
              type="checkbox"
              value="true"
            />
            Varsayılan depo
          </label>
          <button className={submitClass(pending)} disabled={pending} type="submit">
            <Plus aria-hidden="true" className="size-4" />
            {pending ? "Ekleniyor" : "Depo ekle"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function WarehouseUpdateDisclosure({
  warehouse,
}: {
  warehouse: Warehouse;
}) {
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
        <WarehouseUpdateForm warehouse={warehouse} />
      </div>
    </details>
  );
}

function WarehouseUpdateForm({ warehouse }: { warehouse: Warehouse }) {
  return (
    <ActionForm action={updateWarehouseAction} resetOnSuccess={false}>
      {(pending) => (
        <>
          <input name="warehouseId" type="hidden" value={warehouse.id} />
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <label className="grid gap-1.5 text-sm font-medium">
              Kod
              <input
                className={inputClass}
                defaultValue={warehouse.code}
                maxLength={16}
                name="code"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Depo adı
              <input
                className={inputClass}
                defaultValue={warehouse.name}
                name="name"
                required
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

export function WarehouseDefaultForm({ warehouse }: { warehouse: Warehouse }) {
  if (warehouse.isDefault) {
    return null;
  }

  return (
    <ActionForm
      action={updateWarehouseAction}
      className="grid gap-2"
      resetOnSuccess={false}
    >
      {(pending) => (
        <>
          <input name="warehouseId" type="hidden" value={warehouse.id} />
          <input name="code" type="hidden" value={warehouse.code} />
          <input name="name" type="hidden" value={warehouse.name} />
          <input name="isDefault" type="hidden" value="true" />
          <button
            className={submitClass(pending, "subtle")}
            disabled={pending}
            type="submit"
          >
            <Star aria-hidden="true" className="size-4" />
            {pending ? "Güncelleniyor" : "Varsayılan yap"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
