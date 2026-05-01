"use client";

import { ActionForm, submitClass } from "@/components/action-form";
import { inputClass, selectClass } from "@/components/ui";
import { createCreditNoteAction } from "@/lib/actions";
import type { Customer, Product } from "@stockops/core/types";

export function CreditNoteForm({
  customers,
  products,
}: {
  customers: Customer[];
  products: Product[];
}) {
  const isDisabled = customers.length === 0 || products.length === 0;

  return (
    <ActionForm action={createCreditNoteAction}>
      {(pending) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Müşteri
              <select className={selectClass} name="customerId" required>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              İade Edilen Sipariş ID (Opsiyonel)
              <input className={inputClass} name="salesReturnId" placeholder="SR-0001" />
            </label>
          </div>
          
          <label className="grid gap-1.5 text-sm font-medium">
            Notlar
            <textarea className={inputClass} name="notes" rows={2} />
          </label>
          
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Ürün
              <select className={selectClass} name="productId" required>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              İade Miktarı
              <input
                className={inputClass}
                defaultValue="1"
                min="1"
                name="quantity"
                type="number"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Birim Fiyat
              <input
                className={inputClass}
                min="0"
                name="unitPrice"
                step="0.01"
                type="number"
                required
              />
            </label>
          </div>

          <button
            className={submitClass(pending)}
            disabled={pending || isDisabled}
            type="submit"
          >
            {pending ? "Oluşturuluyor..." : "Kredi Notu Oluştur"}
          </button>

          {isDisabled && (
            <p className="text-sm text-red-500 font-medium">
              En az bir müşteri ve bir ürün bulunmalıdır.
            </p>
          )}
        </>
      )}
    </ActionForm>
  );
}
