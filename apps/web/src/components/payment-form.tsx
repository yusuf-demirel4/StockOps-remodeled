"use client";

import { ActionForm, submitClass } from "@/components/action-form";
import { inputClass, selectClass } from "@/components/ui";
import { recordPaymentAction } from "@/lib/actions";

export function PaymentForm({
  invoiceId,
  maxAmount,
}: {
  invoiceId: string;
  maxAmount: number;
}) {
  return (
    <ActionForm action={recordPaymentAction}>
      {(pending) => (
        <>
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Ödeme Miktarı
              <input
                className={inputClass}
                defaultValue={maxAmount}
                max={maxAmount}
                min="0.01"
                name="amount"
                step="0.01"
                type="number"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Ödeme Yöntemi
              <select className={selectClass} name="method" required>
                <option value="BANK_TRANSFER">Havale/EFT</option>
                <option value="CREDIT_CARD">Kredi Kartı</option>
                <option value="CASH">Nakit</option>
                <option value="CHECK">Çek</option>
                <option value="OTHER">Diğer</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            Referans / Not
            <input className={inputClass} name="reference" />
          </label>
          <button
            className={submitClass(pending)}
            disabled={pending || maxAmount <= 0}
            type="submit"
          >
            {pending ? "Kaydediliyor..." : "Ödeme Kaydet"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
