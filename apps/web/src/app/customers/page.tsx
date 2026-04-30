import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Panel, buttonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { listCustomers } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const context = await requireAuth();
  const customers = await listCustomers(context);

  return (
    <AppShell
      description="Müşteri kayıtları ve iletişim bilgileri."
      organizationName={context.organization.name}
      role={context.role}
      title="Müşteriler"
      userName={context.user.name}
    >
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Müşteri listesi</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Satış ve fatura akışlarında kullanılacak hesaplar.
            </p>
          </div>
          <Link className={buttonClass} href="/customers/new">
            Yeni Müşteri
          </Link>
        </div>

        <Panel title="Müşteri listesi">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-2 pr-3">Kod</th>
                  <th className="py-2 pr-3">Firma / Müşteri</th>
                  <th className="py-2 pr-3">E-posta</th>
                  <th className="py-2 pr-3">Telefon</th>
                  <th className="py-2 pr-3">Vade (Gün)</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      Henüz kayıtlı müşteri bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr
                      className="border-b border-[var(--border-table)] align-top last:border-0"
                      key={customer.id}
                    >
                      <td className="py-3 pr-3 font-medium">{customer.code}</td>
                      <td className="py-3 pr-3 font-medium">{customer.name}</td>
                      <td className="py-3 pr-3">{customer.email ?? "-"}</td>
                      <td className="py-3 pr-3">{customer.phone ?? "-"}</td>
                      <td className="py-3 pr-3">{customer.paymentTermDays}</td>
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
