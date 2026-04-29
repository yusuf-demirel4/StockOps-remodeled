"use client";

import { clsx } from "clsx";
import { Check, Pencil, Plus } from "lucide-react";
import { ActionForm, submitClass } from "@/components/action-form";
import { inputClass, subtleButtonClass } from "@/components/ui";
import {
  createSupplierAction,
  updateSupplierAction,
} from "@/lib/actions";
import type { Supplier } from "@stockops/core/types";

export function SupplierCreateForm() {
  return (
    <ActionForm action={createSupplierAction}>
      {(pending) => (
        <>
          <label className="grid gap-1.5 text-sm font-medium">
            Firma adı
            <input className={inputClass} name="name" required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Yetkili
            <input className={inputClass} name="contactName" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            E-posta
            <input className={inputClass} name="email" type="email" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Telefon
            <input className={inputClass} name="phone" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Tedarik süresi
            <input
              className={inputClass}
              min="1"
              name="leadTimeDays"
              required
              type="number"
            />
          </label>
          <button className={submitClass(pending)} disabled={pending} type="submit">
            <Plus aria-hidden="true" className="size-4" />
            {pending ? "Ekleniyor" : "Tedarikçi ekle"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function SupplierUpdateDisclosure({ supplier }: { supplier: Supplier }) {
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
      <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-empty)] p-3">
        <SupplierUpdateForm supplier={supplier} />
      </div>
    </details>
  );
}

function SupplierUpdateForm({ supplier }: { supplier: Supplier }) {
  return (
    <ActionForm action={updateSupplierAction} resetOnSuccess={false}>
      {(pending) => (
        <>
          <input name="supplierId" type="hidden" value={supplier.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Firma adı
              <input
                className={inputClass}
                defaultValue={supplier.name}
                name="name"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Yetkili
              <input
                className={inputClass}
                defaultValue={supplier.contactName ?? ""}
                name="contactName"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              E-posta
              <input
                className={inputClass}
                defaultValue={supplier.email ?? ""}
                name="email"
                type="email"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Telefon
              <input
                className={inputClass}
                defaultValue={supplier.phone ?? ""}
                name="phone"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Tedarik süresi
              <input
                className={inputClass}
                defaultValue={supplier.leadTimeDays}
                min="1"
                name="leadTimeDays"
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
