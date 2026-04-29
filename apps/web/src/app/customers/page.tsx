import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getDataSourceMode } from "@/lib/data-source";
import { getPrisma } from "@/lib/prisma";
import type { Customer } from "@stockops/core/types";
import { getDemoSnapshot } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const context = await requireAuth();
  
  let customers: Customer[] = [];
  if (getDataSourceMode() === "database") {
    const raw = await getPrisma().customer.findMany({
      where: { organizationId: context.organization.id },
      orderBy: { name: "asc" },
    });
    customers = raw.map(c => ({
      ...c,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      taxId: c.taxId ?? undefined,
      address: c.address ?? undefined,
      createdAt: c.createdAt.toISOString(),
    }));
  } else {
    // Demo fallback - get from demo snapshot if exists or empty array
    // Customers are not in demo snapshot by default, so we just use empty array for now
    customers = [];
  }

  return (
    <AppShell
      description="Müşteri kayıtları ve iletişim bilgileri."
      organizationName={context.organization.name}
      role={context.role}
      title="Müşteriler"
      userName={context.user.name}
    >
      <div className="grid gap-6">
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
