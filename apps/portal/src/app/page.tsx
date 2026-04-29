import { PortalShell } from "@/components/portal-shell";
import { Panel, StatusBadge, EmptyState } from "@/components/ui";
import { requirePortalAuth } from "@/lib/auth";
import { Package, ShoppingCart, FileText, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const ctx = await requirePortalAuth();

  // Demo data - in production these come from DB
  const stats = {
    openOrders: 3,
    totalOrders: 12,
    pendingInvoices: 2,
    totalProducts: 45,
  };

  const recentOrders = [
    { code: "SO-1001", date: "2026-04-25", status: "CONFIRMED", total: 4 },
    { code: "SO-1002", date: "2026-04-22", status: "SHIPPED", total: 2 },
    { code: "SO-1003", date: "2026-04-18", status: "DELIVERED", total: 7 },
  ];

  return (
    <PortalShell
      title="Hoş Geldiniz"
      description={`${ctx.customer.name} müşteri portalı`}
      customerName={ctx.customerUser.name}
      organizationName={ctx.organization.name}
    >
      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Açık Siparişler", value: stats.openOrders, icon: ShoppingCart, color: "text-[var(--accent-primary)]" },
          { label: "Toplam Sipariş", value: stats.totalOrders, icon: Clock, color: "text-[var(--text-secondary)]" },
          { label: "Bekleyen Faturalar", value: stats.pendingInvoices, icon: FileText, color: "text-[var(--accent-warning-text)]" },
          { label: "Ürün Kataloğu", value: stats.totalProducts, icon: Package, color: "text-[var(--text-secondary)]" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">{stat.label}</p>
                <Icon className={`size-5 ${stat.color}`} />
              </div>
              <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent orders */}
      <Panel title="Son siparişler">
        {recentOrders.length === 0 ? (
          <EmptyState>Henüz sipariş bulunmuyor.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-2 pr-3">Sipariş No</th>
                  <th className="py-2 pr-3">Tarih</th>
                  <th className="py-2 pr-3">Ürün Adedi</th>
                  <th className="py-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.code}
                    className="border-b border-[var(--border-table)] last:border-0"
                  >
                    <td className="py-3 pr-3 font-mono text-xs">{order.code}</td>
                    <td className="py-3 pr-3 text-[var(--text-secondary)]">
                      {new Date(order.date).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3 pr-3">{order.total}</td>
                    <td className="py-3">
                      <StatusBadge
                        tone={
                          order.status === "DELIVERED"
                            ? "success"
                            : order.status === "SHIPPED"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {order.status === "CONFIRMED"
                          ? "Onaylandı"
                          : order.status === "SHIPPED"
                            ? "Kargoda"
                            : "Teslim Edildi"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </PortalShell>
  );
}
