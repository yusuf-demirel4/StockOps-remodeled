"use client";

import { ActionForm, submitClass } from "@/components/action-form";
import { inputClass } from "@/components/ui";
import { createCustomerAction } from "@/lib/actions";

export function CustomerForm() {
  return (
    <ActionForm action={createCustomerAction}>
      {(pending) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Kod
              <input className={inputClass} name="code" required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Ad
              <input className={inputClass} name="name" required />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              E-posta
              <input className={inputClass} name="email" type="email" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Telefon
              <input className={inputClass} name="phone" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Vergi No
              <input className={inputClass} name="taxId" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Vade (gun)
              <input
                className={inputClass}
                defaultValue="30"
                min="0"
                name="paymentTermDays"
                type="number"
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            Adres
            <input className={inputClass} name="address" />
          </label>
          <button className={submitClass(pending)} disabled={pending} type="submit">
            {pending ? "Kaydediliyor" : "Musteri olustur"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
