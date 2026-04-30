import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ActionForm, submitClass } from "@/components/action-form";
import {
  Panel,
  inputClass,
  selectClass,
  subtleButtonClass,
} from "@/components/ui";
import { createInvoiceAction } from "@/lib/actions";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot, listCustomers } from "@/lib/repository";

const currencies = ["TRY", "USD", "EUR", "GBP"];

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const context = await requireAuth();
  const [snapshot, customers] = await Promise.all([
    getAppSnapshot(context),
    listCustomers(context),
  ]);
  const activeProducts = snapshot.products.filter((product) => product.isActive);
  const isDisabled = customers.length === 0 || activeProducts.length === 0;

  return (
    <AppShell
      description="Tek satırlı taslak fatura oluşturun."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Yeni Fatura"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6">
        <Link className={subtleButtonClass} href="/invoices">
          Faturalara dön
        </Link>

        <Panel title="Fatura bilgileri" className="max-w-3xl">
          <ActionForm action={createInvoiceAction}>
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
                    Vade tarihi
                    <input className={inputClass} name="dueDate" type="date" />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium">
                    Para birimi
                    <select
                      className={selectClass}
                      defaultValue={context.organization.defaultCurrency ?? "TRY"}
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
                    Vergi oranı
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
                    Ürün
                    <select className={selectClass} name="productId" required>
                      {activeProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.sku} - {product.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    Açıklama
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
                    İndirim %
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
                  {pending ? "Kaydediliyor" : "Fatura oluştur"}
                </button>
              </>
            )}
          </ActionForm>
        </Panel>
      </div>
    </AppShell>
  );
}
