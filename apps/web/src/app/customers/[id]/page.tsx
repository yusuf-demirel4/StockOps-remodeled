import { requireAuth } from "@/lib/auth";
import { getCustomer } from "@/lib/repository";
import { formatCurrency, formatDate } from "@stockops/core/format";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ActionForm, submitClass } from "@/components/action-form";
import { upsertCustomerPriceTierAction, deleteCustomerPriceTierAction } from "@/lib/actions";
import { listProducts } from "@/lib/repository";
import { inputClass, selectClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const context = await requireAuth();
  const result = await getCustomer(params.id, context);

  if (!result) notFound();

  const { customer, orders, invoices, priceTiers } = result;
  const products = await listProducts(context);

  return (
    <AppShell
      title={`Müşteri: ${customer.name}`}
      description={`${customer.code} — ${customer.email ?? "E-posta yok"}`}
      organizationName={context.organization.name}
      role={context.role}
      userName={context.user.name}
    >
      <div className="grid gap-6">
        {/* Üst başlık */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {customer.code}
              {customer.taxId ? ` · VKN: ${customer.taxId}` : ""}
              {customer.address ? ` · ${customer.address}` : ""}
            </p>
          </div>
          <Link
            href="/customers"
            className="text-sm text-[var(--accent-primary)] hover:underline"
          >
            ← Listeye Dön
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sol sütun */}
          <div className="lg:col-span-2 space-y-6">

            {/* Satış Siparişleri */}
            <Panel title={`Satış Siparişleri (${orders.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-[var(--text-secondary)]">
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-2 pr-3">Kod</th>
                      <th className="py-2 pr-3">Durum</th>
                      <th className="py-2 pr-3">Tarih</th>
                      <th className="py-2">Detay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-[var(--text-secondary)]">
                          Satış siparişi bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (orders as any[]).map((order) => (
                        <tr key={order.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{order.code}</td>
                          <td className="py-2 pr-3">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--accent-info-bg)] text-[var(--accent-info-text)]">
                              {order.status}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-[var(--text-secondary)]">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="py-2">
                            <Link
                              href={`/orders/${order.id}`}
                              className="text-xs text-[var(--accent-primary)] hover:underline"
                            >
                              Görüntüle →
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* Faturalar */}
            <Panel title={`Faturalar (${invoices.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-[var(--text-secondary)]">
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-2 pr-3">Fatura</th>
                      <th className="py-2 pr-3">Durum</th>
                      <th className="py-2 pr-3 text-right">Tutar</th>
                      <th className="py-2 pr-3 text-right">Ödenen</th>
                      <th className="py-2">Detay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[var(--text-secondary)]">
                          Fatura bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (invoices as any[]).map((inv) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const paid = (inv.payments as any[])?.reduce((s: number, p: any) => s + Number(p.amount), 0) ?? 0;
                        return (
                          <tr key={inv.id} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-medium">{inv.code}</td>
                            <td className="py-2 pr-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                inv.status === "PAID"
                                  ? "bg-green-100 text-green-800"
                                  : inv.status === "PARTIALLY_PAID"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : inv.status === "OVERDUE"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-right font-medium">
                              {formatCurrency(Number(inv.total))}
                            </td>
                            <td className="py-2 pr-3 text-right text-green-600">
                              {formatCurrency(paid)}
                            </td>
                            <td className="py-2">
                              <Link
                                href={`/invoices/${inv.id}`}
                                className="text-xs text-[var(--accent-primary)] hover:underline"
                              >
                                Görüntüle →
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* Fiyat Katmanları */}
            <Panel title="Müşteriye Özel Fiyat Katmanları">
              {/* Mevcut Katmanlar */}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(priceTiers as any[]).length > 0 && (
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase text-[var(--text-secondary)]">
                      <tr className="border-b border-[var(--border-subtle)]">
                        <th className="py-2 pr-3">Ürün</th>
                        <th className="py-2 pr-3 text-right">Min. Miktar</th>
                        <th className="py-2 pr-3 text-right">Özel Fiyat</th>
                        <th className="py-2">Sil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(priceTiers as any[]).map((tier) => (
                        <tr key={tier.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">
                            {tier.product?.name ?? tier.productId}
                          </td>
                          <td className="py-2 pr-3 text-right">{tier.minQuantity}</td>
                          <td className="py-2 pr-3 text-right font-medium">
                            {formatCurrency(Number(tier.tierPrice))}
                          </td>
                          <td className="py-2">
                            <ActionForm action={deleteCustomerPriceTierAction}>
                              {(pending) => (
                                <>
                                  <input type="hidden" name="tierId" value={tier.id} />
                                  <button
                                    type="submit"
                                    disabled={pending}
                                    className="text-xs text-red-500 hover:underline"
                                  >
                                    Sil
                                  </button>
                                </>
                              )}
                            </ActionForm>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Yeni Katman Ekle */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase">
                  Yeni Fiyat Katmanı Ekle
                </p>
                <ActionForm action={upsertCustomerPriceTierAction}>
                  {(pending) => (
                    <div className="grid gap-3 sm:grid-cols-4">
                      <input type="hidden" name="customerId" value={customer.id} />
                      <label className="grid gap-1.5 text-sm font-medium">
                        Ürün
                        <select className={selectClass} name="productId" required>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} — {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-sm font-medium">
                        Min. Miktar
                        <input
                          className={inputClass}
                          defaultValue="1"
                          min="1"
                          name="minQuantity"
                          type="number"
                          required
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm font-medium">
                        Özel Fiyat (₺)
                        <input
                          className={inputClass}
                          min="0"
                          name="tierPrice"
                          step="0.01"
                          type="number"
                          required
                        />
                      </label>
                      <div className="flex items-end">
                        <button className={submitClass(pending)} disabled={pending} type="submit">
                          {pending ? "Kaydediliyor..." : "Kaydet"}
                        </button>
                      </div>
                    </div>
                  )}
                </ActionForm>
              </div>
            </Panel>
          </div>

          {/* Sağ sütun — Müşteri bilgileri */}
          <div className="space-y-6">
            <Panel title="Müşteri Bilgileri">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-[var(--text-secondary)]">İsim / Firma</dt>
                  <dd className="font-medium">{customer.name}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-secondary)]">Kod</dt>
                  <dd className="font-medium">{customer.code}</dd>
                </div>
                {customer.email && (
                  <div>
                    <dt className="text-[var(--text-secondary)]">E-posta</dt>
                    <dd className="font-medium">{customer.email}</dd>
                  </div>
                )}
                {customer.phone && (
                  <div>
                    <dt className="text-[var(--text-secondary)]">Telefon</dt>
                    <dd className="font-medium">{customer.phone}</dd>
                  </div>
                )}
                {customer.taxId && (
                  <div>
                    <dt className="text-[var(--text-secondary)]">VKN / TC</dt>
                    <dd className="font-medium">{customer.taxId}</dd>
                  </div>
                )}
                {customer.address && (
                  <div>
                    <dt className="text-[var(--text-secondary)]">Adres</dt>
                    <dd className="font-medium">{customer.address}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-[var(--text-secondary)]">Ödeme Vadesi</dt>
                  <dd className="font-medium">{customer.paymentTermDays} gün</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-secondary)]">Durum</dt>
                  <dd>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      customer.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {customer.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </dd>
                </div>
              </dl>
            </Panel>

            {/* Özet */}
            <Panel title="Özet">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Toplam Sipariş</dt>
                  <dd className="font-medium">{orders.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Toplam Fatura</dt>
                  <dd className="font-medium">{invoices.length}</dd>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <dt className="font-medium">Toplam Borç</dt>
                  <dd className="font-bold text-red-600">
                    {formatCurrency(
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (invoices as any[]).reduce((s, inv) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const paid = (inv.payments as any[])?.reduce((sp: number, p: any) => sp + Number(p.amount), 0) ?? 0;
                        return s + Math.max(0, Number(inv.total) - paid);
                      }, 0)
                    )}
                  </dd>
                </div>
              </dl>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
