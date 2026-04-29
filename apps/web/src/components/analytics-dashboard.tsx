"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { Panel, EmptyState } from "@/components/ui";
import type { AppSnapshot } from "@stockops/core/types";

const CHART_COLORS = [
  "var(--chart-1, #6366f1)",
  "var(--chart-2, #22c55e)",
  "var(--chart-3, #f59e0b)",
  "var(--chart-4, #ef4444)",
  "var(--chart-5, #06b6d4)",
  "var(--chart-6, #8b5cf6)",
  "var(--chart-7, #ec4899)",
  "var(--chart-8, #14b8a6)",
];

function useAnalyticsData(snapshot: AppSnapshot) {
  return useMemo(() => {
    // Stock by warehouse
    const warehouseStock = snapshot.warehouses.map((w) => {
      const total = snapshot.stockRows
        .filter((r) => r.warehouse.id === w.id)
        .reduce((sum, r) => sum + r.onHand, 0);
      return { name: w.name, value: total };
    });

    // Stock by category
    const categoryMap = new Map<string, number>();
    for (const row of snapshot.stockRows) {
      const cat = row.product.category || "Diğer";
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + row.onHand);
    }
    const stockByCategory = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Sales order status distribution
    const statusMap = new Map<string, number>();
    for (const order of snapshot.salesOrders) {
      statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1);
    }
    const ordersByStatus = Array.from(statusMap.entries()).map(([name, value]) => ({
      name: statusLabel(name),
      value,
    }));

    // Critical stock items (top 10)
    const criticalItems = snapshot.criticalRows.slice(0, 10).map((r) => ({
      name: r.product.sku,
      onHand: r.onHand,
      minimum: r.minimumStock,
      shortage: Math.max(0, r.minimumStock - r.onHand),
    }));

    // Top products by movement volume
    const productMovements = new Map<string, { inbound: number; outbound: number }>();
    for (const m of snapshot.stockMovements) {
      const entry = productMovements.get(m.productId) ?? { inbound: 0, outbound: 0 };
      if (m.quantityChange > 0) entry.inbound += m.quantityChange;
      else entry.outbound += Math.abs(m.quantityChange);
      productMovements.set(m.productId, entry);
    }
    const topProducts = Array.from(productMovements.entries())
      .map(([productId, data]) => {
        const product = snapshot.products.find((p) => p.id === productId);
        return { name: product?.sku ?? productId.slice(0, 8), ...data };
      })
      .sort((a, b) => b.inbound + b.outbound - (a.inbound + a.outbound))
      .slice(0, 8);

    // Daily movement trend (last 30 days)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const dailyMap = new Map<string, { inbound: number; outbound: number }>();
    for (const m of snapshot.stockMovements) {
      const date = new Date(m.createdAt);
      if (date.getTime() < thirtyDaysAgo) continue;
      const key = date.toISOString().slice(0, 10);
      const entry = dailyMap.get(key) ?? { inbound: 0, outbound: 0 };
      if (m.quantityChange > 0) entry.inbound += m.quantityChange;
      else entry.outbound += Math.abs(m.quantityChange);
      dailyMap.set(key, entry);
    }
    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date: date.slice(5), // MM-DD
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      warehouseStock,
      stockByCategory,
      ordersByStatus,
      criticalItems,
      topProducts,
      dailyTrend,
    };
  }, [snapshot]);
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    DRAFT: "Taslak",
    CONFIRMED: "Onaylı",
    PICKING: "Toplama",
    PACKED: "Paketli",
    SHIPPED: "Kargoda",
    DELIVERED: "Teslim",
    CANCELLED: "İptal",
    SENT: "Gönderildi",
    COMPLETED: "Tamamlandı",
    PARTIALLY_RECEIVED: "Kısmi Teslim",
  };
  return map[status] ?? status;
}

export function AnalyticsDashboard({ snapshot }: { snapshot: AppSnapshot }) {
  const data = useAnalyticsData(snapshot);

  return (
    <div className="grid gap-6">
      {/* Row 1: warehouse stock + category pie */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Depoya göre stok">
          {data.warehouseStock.length === 0 ? (
            <EmptyState>Stok verisi yok</EmptyState>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.warehouseStock}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="name" fontSize={12} tick={{ fill: "var(--text-secondary)" }} />
                  <YAxis fontSize={12} tick={{ fill: "var(--text-secondary)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-primary)",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="value" name="Eldeki" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Kategoriye göre stok">
          {data.stockByCategory.length === 0 ? (
            <EmptyState>Stok verisi yok</EmptyState>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.stockByCategory}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={({ name, percent }: any) =>
                      `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    fontSize={11}
                  >
                    {data.stockByCategory.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-primary)",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {/* Row 2: daily trend */}
      {data.dailyTrend.length > 0 && (
        <Panel title="Stok hareketleri trendi (son 30 gün)">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" fontSize={12} tick={{ fill: "var(--text-secondary)" }} />
                <YAxis fontSize={12} tick={{ fill: "var(--text-secondary)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-primary)",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="inbound"
                  name="Giriş"
                  stroke={CHART_COLORS[1]}
                  fill={CHART_COLORS[1]}
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="outbound"
                  name="Çıkış"
                  stroke={CHART_COLORS[3]}
                  fill={CHART_COLORS[3]}
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {/* Row 3: order status + top products */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Sipariş durumları">
          {data.ordersByStatus.length === 0 ? (
            <EmptyState>Sipariş verisi yok</EmptyState>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.ordersByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    fontSize={11}
                  >
                    {data.ordersByStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-primary)",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="En hareketli ürünler">
          {data.topProducts.length === 0 ? (
            <EmptyState>Hareket verisi yok</EmptyState>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis type="number" fontSize={12} tick={{ fill: "var(--text-secondary)" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    fontSize={11}
                    tick={{ fill: "var(--text-secondary)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-primary)",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="inbound" name="Giriş" fill={CHART_COLORS[1]} stackId="a" />
                  <Bar
                    dataKey="outbound"
                    name="Çıkış"
                    fill={CHART_COLORS[3]}
                    stackId="a"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {/* Row 4: Critical stock */}
      {data.criticalItems.length > 0 && (
        <Panel title="Kritik stok seviyeleri">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.criticalItems}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: "var(--text-secondary)" }} />
                <YAxis fontSize={12} tick={{ fill: "var(--text-secondary)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-primary)",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Legend />
                <Bar dataKey="onHand" name="Eldeki" fill={CHART_COLORS[0]} />
                <Bar dataKey="minimum" name="Minimum" fill={CHART_COLORS[2]} />
                <Bar dataKey="shortage" name="Eksik" fill={CHART_COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}
    </div>
  );
}
