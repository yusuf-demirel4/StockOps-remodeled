import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Panel, buttonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot, listInvoices } from "@/lib/repository";
import { crossRate } from "@stockops/core/currency";
import type { Invoice } from "@stockops/core/types";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);
  const orgCurrency = context.organization.defaultCurrency ?? "TRY";
  const locale = localeCode(context.organization.locale);
  
  const invoices = await listInvoices(context);

  return (
    <AppShell
      description="Kesilen faturalar ve finansal kayıtlar."
      organizationName={context.organization.name}
      role={context.role}
      title="Faturalar"
      userName={context.user.name}
    >
      <div className="grid gap-6">
        <div className="flex justify-end">
          <Link className={buttonClass} href="/invoices/new">
            Yeni Fatura
          </Link>
        </div>

        <Panel title="Fatura listesi">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-2 pr-3">Fatura No</th>
                  <th className="py-2 pr-3">Tarih</th>
                  <th className="py-2 pr-3">Durum</th>
                  <th className="py-2 pr-3">Toplam</th>
                  <th className="py-2 pr-3">Para Birimi</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      Henüz kesilmiş fatura bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr
                      className="border-b border-[var(--border-table)] align-top last:border-0"
                      key={invoice.id}
                    >
                      <td className="py-3 pr-3 font-medium">{invoice.code}</td>
                      <td className="py-3 pr-3">{new Date(invoice.createdAt).toLocaleDateString(locale)}</td>
                      <td className="py-3 pr-3">
                        <span className="rounded bg-[var(--bg-hover-nav)] px-2 py-1 text-xs font-medium text-[var(--text-nav)]">
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3 font-medium">
                        {formatMoney(invoice.total, invoice.currency, locale)}
                        {invoice.currency !== orgCurrency ? (
                          <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                            {convertedInvoiceTotal(invoice, orgCurrency, snapshot.exchangeRates, locale)}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 text-gray-500">{invoice.currency}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function localeCode(locale?: string) {
  return locale === "en" ? "en-US" : "tr-TR";
}

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    currency,
    style: "currency",
  }).format(amount);
}

function convertedInvoiceTotal(
  invoice: Invoice,
  quoteCurrency: string,
  rates: Array<{ baseCurrency: string; quoteCurrency: string; rate: number }>,
  locale: string,
) {
  try {
    const rate = crossRate(rates, invoice.currency, quoteCurrency);
    return formatMoney(invoice.total * rate, quoteCurrency, locale);
  } catch {
    return `${quoteCurrency} kuru yok`;
  }
}
