"use client";

import { ActionForm, submitClass } from "@/components/action-form";
import { inputClass, selectClass } from "@/components/ui";
import { createInvoiceAction } from "@/lib/actions";
import type { Customer, Product } from "@stockops/core/types";

const currencies = ["TRY", "USD", "EUR", "GBP"];

export function InvoiceForm({
  customers,
  defaultCurrency,
  products,
}: {
  customers: Customer[];
  defaultCurrency: string;
  products: Product[];
}) {
  const isDisabled = customers.length === 0 || products.length === 0;

  return (
    <ActionForm action={createInvoiceAction}>
      {(pending) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Musteri
              <select className={selectClass} name="customerId" required>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Vade tarihi
              <input className={inputClass} name="dueDate" type="date" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Para birimi
              <select
                className={selectClass}
                defaultValue={defaultCurrency}
                name="currency"
              >
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Vergi orani
              <input
                className={inputClass}
                defaultValue="0.2"
                max="1"
                min="0"
                name="taxRate"
                step="0.01"
                type="number"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Urun
              <select className={selectClass} name="productId" required>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Aciklama
              <input className={inputClass} name="description" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Miktar
              <input
                className={inputClass}
                defaultValue="1"
                min="1"
                name="quantity"
                type="number"
              />
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
              Indirim %
              <input
                className={inputClass}
                defaultValue="0"
                max="100"
                min="0"
                name="discount"
                step="0.01"
                type="number"
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            Not
            <input className={inputClass} name="notes" />
          </label>
          <button
            className={submitClass(pending)}
            disabled={pending || isDisabled}
            type="submit"
          >
            {pending ? "Kaydediliyor" : "Fatura olustur"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
