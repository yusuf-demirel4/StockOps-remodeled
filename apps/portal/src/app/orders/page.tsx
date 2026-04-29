import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { Panel, StatusBadge, EmptyState, buttonClass } from "@/components/ui";
import { requirePortalAuth } from "@/lib/auth";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

const demoOrders = [
  {
    code: "SO-1001",
    date: "2026-04-25",
    status: "CONFIRMED",
    lines: [
      { sku: "WDG-001", name: "Widget Alpha", qty: 10, price: 21.5 },
      { sku: "ACC-001", name: "Aksesuar Paketi", qty: 20, price: 12.5 },
    ],
  },
  {
    code: "SO-1002",
    date: "2026-04-22",
    status: "SHIPPED",
    trackingNumber: "YK123456789",
    lines: [
      { sku: "GDG-001", name: "Gadget Pro", qty: 5, price: 129.99 },
    ],
  },
  {
    code: "SO-1003",
    date: "2026-04-18",
    status: "DELIVERED",
    lines: [
      { sku: "WDG-002", name: "Widget Beta", qty: 15, price: 35.0 },
      { sku: "CMP-001", name: "Bileşen X", qty: 50, price: 4.5 },
      { sku: "CMP-002", name: "Bileşen Y", qty: 30, price: 7.0 },
    ],
  },
];

const fmt = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

function orderStatusLabel(status: string) {
  const map: Record<string, string> = {
    DRAFT: "Taslak",
    CONFIRMED: "Onaylandı",
    PICKING: "Hazırlanıyor",
    PACKED: "Paketlendi",
    SHIPPED: "Kargoda",
    DELIVERED: "Teslim Edildi",
    CANCELLED: "İptal",
  };
  return map[status] ?? status;
}

function orderStatusTone(status: string) {
  if (status === "DELIVERED") return "success" as const;
  if (status === "SHIPPED" || status === "PICKING" || status === "PACKED") return "warning" as const;
  if (status === "CANCELLED") return "danger" as const;
  return "neutral" as const;
}

export default async function OrdersPage() {
  const ctx = await requirePortalAuth();

  return (
    <PortalShell
      title="Siparişlerim"
      description="Sipariş geçmişinizi görüntüleyin ve takip edin."
      customerName={ctx.customerUser.name}
      organizationName={ctx.organization.name}
    >
      <div className="mb-4 flex justify-end">
        <Link href="/orders/new" className={buttonClass}>
          <Plus className="size-4" />
          Yeni sipariş
        </Link>
      </div>

      <div className="grid gap-4">
        {demoOrders.map((order) => {
          const total = order.lines.reduce((s, l) => s + l.qty * l.price, 0);
          return (
            <Panel key={order.code} title={order.code}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <StatusBadge tone={orderStatusTone(order.status)}>
                      {orderStatusLabel(order.status)}
                    </StatusBadge>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {new Date(order.date).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  {"trackingNumber" in order && order.trackingNumber && (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Takip No: <span className="font-mono">{order.trackingNumber}</span>
                    </p>
                  )}
                </div>
                <p className="text-lg font-semibold">{fmt.format(total)}</p>
              </div>

              <table className="mt-3 w-full text-left text-sm">
                <thead className="text-xs text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="py-1.5 pr-3">SKU</th>
                    <th className="py-1.5 pr-3">Ürün</th>
                    <th className="py-1.5 pr-3 text-right">Adet</th>
                    <th className="py-1.5 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((line) => (
                    <tr
                      key={line.sku}
                      className="border-b border-[var(--border-table)] last:border-0"
                    >
                      <td className="py-2 pr-3 font-mono text-xs">{line.sku}</td>
                      <td className="py-2 pr-3">{line.name}</td>
                      <td className="py-2 pr-3 text-right">{line.qty}</td>
                      <td className="py-2 text-right font-mono text-xs">
                        {fmt.format(line.qty * line.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          );
        })}
      </div>
    </PortalShell>
  );
}
