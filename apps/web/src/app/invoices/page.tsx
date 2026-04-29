import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getDataSourceMode } from "@/lib/data-source";
import { getPrisma } from "@/lib/prisma";
import type { Invoice } from "@stockops/core/types";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const context = await requireAuth();
  
  let invoices: Invoice[] = [];
  if (getDataSourceMode() === "database") {
    const raw = await getPrisma().invoice.findMany({
      where: { organizationId: context.organization.id },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    });
    invoices = raw.map(inv => ({
      ...inv,
      issuedAt: inv.issuedAt?.toISOString(),
      dueDate: inv.dueDate?.toISOString(),
      notes: inv.notes ?? undefined,
      subtotal: Number(inv.subtotal),
      discountAmount: Number(inv.discountAmount),
      taxRate: Number(inv.taxRate),
      taxAmount: Number(inv.taxAmount),
      total: Number(inv.total),
      lines: inv.lines.map(l => ({
        ...l,
        description: l.description ?? undefined,
        unitPrice: Number(l.unitPrice),
        discount: Number(l.discount),
        lineTotal: Number(l.lineTotal),
      })),
      createdAt: inv.createdAt.toISOString(),
    }));
  }

  return (
    <AppShell
      description="Kesilen faturalar ve finansal kayıtlar."
      organizationName={context.organization.name}
      role={context.role}
      title="Faturalar"
      userName={context.user.name}
    >
      <div className="grid gap-6">
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
                      <td className="py-3 pr-3">{new Date(invoice.createdAt).toLocaleDateString("tr-TR")}</td>
                      <td className="py-3 pr-3">
                        <span className="rounded bg-[var(--bg-hover-nav)] px-2 py-1 text-xs font-medium text-[var(--text-nav)]">
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3 font-medium">{invoice.total.toFixed(2)}</td>
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
