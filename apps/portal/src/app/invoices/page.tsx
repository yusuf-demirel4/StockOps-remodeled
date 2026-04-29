import { PortalShell } from "@/components/portal-shell";
import { Panel, StatusBadge, EmptyState } from "@/components/ui";
import { requirePortalAuth } from "@/lib/auth";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

const demoInvoices = [
  {
    code: "INV-1001",
    date: "2026-04-25",
    dueDate: "2026-05-25",
    status: "SENT",
    total: 465.0,
    lines: [
      { description: "Widget Alpha x10", amount: 215.0 },
      { description: "Aksesuar Paketi x20", amount: 250.0 },
    ],
  },
  {
    code: "INV-1002",
    date: "2026-04-22",
    dueDate: "2026-05-22",
    status: "SENT",
    total: 649.95,
    lines: [{ description: "Gadget Pro x5", amount: 649.95 }],
  },
  {
    code: "INV-1003",
    date: "2026-04-18",
    dueDate: "2026-05-18",
    status: "PAID",
    total: 735.0,
    lines: [
      { description: "Widget Beta x15", amount: 525.0 },
      { description: "Bileşen Y x30", amount: 210.0 },
    ],
  },
];

const fmt = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export default async function InvoicesPage() {
  const ctx = await requirePortalAuth();

  return (
    <PortalShell
      title="Faturalarım"
      description="Fatura geçmişinizi görüntüleyin ve indirin."
      customerName={ctx.customerUser.name}
      organizationName={ctx.organization.name}
    >
      <div className="grid gap-4">
        {demoInvoices.map((invoice) => (
          <Panel key={invoice.code} title={invoice.code}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    tone={invoice.status === "PAID" ? "success" : "warning"}
                  >
                    {invoice.status === "PAID" ? "Ödendi" : "Bekliyor"}
                  </StatusBadge>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {new Date(invoice.date).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Vade: {new Date(invoice.dueDate).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">{fmt.format(invoice.total)}</p>
                <button
                  type="button"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline"
                >
                  <Download className="size-3" />
                  PDF indir
                </button>
              </div>
            </div>

            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-xs text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-1.5 pr-3">Açıklama</th>
                  <th className="py-1.5 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border-table)] last:border-0"
                  >
                    <td className="py-2 pr-3">{line.description}</td>
                    <td className="py-2 text-right font-mono text-xs">
                      {fmt.format(line.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        ))}
      </div>
    </PortalShell>
  );
}
