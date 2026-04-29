import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  PackageCheck,
  PackageSearch,
  ShoppingCart,
  Truck,
} from "lucide-react";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  EmptyState,
  Panel,
  StatCard,
  StatusBadge,
  subtleButtonClass,
} from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import { buildDashboardSummary, stockShortage } from "@stockops/core/dashboard";
import { buildPurchaseRecommendations } from "@stockops/core/purchase-recommendations";
import {
  formatDate,
  movementLabel,
  numberFormatter,
  productName,
  productSku,
  purchaseStatusLabel,
  salesStatusLabel,
  supplierName,
  warehouseName,
} from "@stockops/core/format";
import type { Product, PurchaseOrder, SalesOrder } from "@stockops/core/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);
  const summary = buildDashboardSummary(snapshot);
  const purchaseRecommendations = buildPurchaseRecommendations(snapshot);
  const actionableOrderCount =
    summary.readySalesOrderCount +
    summary.openPurchaseOrderCount +
    purchaseRecommendations.length;

  return (
    <AppShell
      description="Stok sağlığı, depo yükü, sipariş kuyruğu ve son hareketlerin operasyon özeti."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Dashboard"
      userName={snapshot.user.name}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          caption={`${numberFormatter.format(summary.inactiveProductCount)} pasif ürün`}
          icon={PackageSearch}
          title="Aktif ürün"
          value={numberFormatter.format(summary.activeProductCount)}
        />
        <StatCard
          caption={`${numberFormatter.format(summary.totalOnHand)} birim elde`}
          icon={PackageCheck}
          title="Stok sağlığı"
          tone={summary.criticalStockRowCount > 0 ? "warning" : "success"}
          value={`%${numberFormatter.format(summary.stockHealthPercent)}`}
        />
        <StatCard
          caption={`${numberFormatter.format(summary.criticalProductCount)} SKU etkileniyor`}
          icon={AlertTriangle}
          title="Kritik stok"
          tone={summary.criticalStockRowCount > 0 ? "critical" : "success"}
          value={numberFormatter.format(summary.criticalStockRowCount)}
        />
        <StatCard
          caption="Onay, teslim ve satın alma önerileri"
          icon={ClipboardList}
          title="İş kuyruğu"
          tone={actionableOrderCount > 0 ? "warning" : "success"}
          value={numberFormatter.format(actionableOrderCount)}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Operasyon özeti">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric
              caption="Açık satış birimi"
              icon={ClipboardCheck}
              value={summary.openSalesUnits}
            />
            <SummaryMetric
              caption="Onaylanabilir satış"
              icon={CheckCircle2}
              value={summary.readySalesOrderCount}
            />
            <SummaryMetric
              caption="Stok blokeli satış"
              icon={AlertTriangle}
              tone="danger"
              value={summary.blockedSalesOrderCount}
            />
            <SummaryMetric
              caption="Bekleyen teslim birimi"
              icon={Truck}
              tone="warning"
              value={summary.pendingPurchaseUnits}
            />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--text-panel-heading)]">Stok satırı sağlığı</span>
              <span className="font-mono text-xs text-[var(--text-muted)]">
                %{numberFormatter.format(summary.stockHealthPercent)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--progress-bg)]">
              <div
                className="h-full rounded-full bg-[var(--accent-primary)]"
                style={{ width: `${summary.stockHealthPercent}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {numberFormatter.format(summary.criticalStockRowCount)} stok satırı
              minimum seviyede veya altında.
            </p>
          </div>
        </Panel>

        <Panel title="Depo dağılımı">
          <div className="space-y-4">
            {summary.warehouseSummaries.map((warehouseSummary) => (
              <div key={warehouseSummary.warehouse.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{warehouseSummary.warehouse.name}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {numberFormatter.format(
                        warehouseSummary.stockedProductCount,
                      )}{" "}
                      stoklu SKU ·{" "}
                      {numberFormatter.format(warehouseSummary.criticalCount)}{" "}
                      kritik satır
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold">
                    {numberFormatter.format(warehouseSummary.onHand)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--progress-bg)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent-secondary)]"
                    style={{
                      width: `${Math.max(
                        warehouseSummary.stockSharePercent,
                        warehouseSummary.onHand > 0 ? 4 : 0,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Kritik stok">
          {summary.criticalRows.length === 0 ? (
            <EmptyState>Kritik stok bulunmuyor.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Ürün</th>
                    <th className="py-2 pr-3">Depo</th>
                    <th className="py-2 pr-3">Eldeki</th>
                    <th className="py-2 pr-3">Minimum</th>
                    <th className="py-2">Eksik</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.criticalRows.slice(0, 8).map((row) => (
                    <tr
                      className="border-b border-[var(--border-table)] last:border-0"
                      key={`${row.product.id}-${row.warehouse.id}`}
                    >
                      <td className="py-3 pr-3 font-mono text-xs">
                        {row.product.sku}
                      </td>
                      <td className="py-3 pr-3 font-medium">
                        {row.product.name}
                      </td>
                      <td className="py-3 pr-3">{row.warehouse.name}</td>
                      <td className="py-3 pr-3">
                        <StatusBadge tone="danger">
                          {numberFormatter.format(row.onHand)}
                        </StatusBadge>
                      </td>
                      <td className="py-3 pr-3">
                        {numberFormatter.format(row.minimumStock)}
                      </td>
                      <td className="py-3 font-mono font-semibold text-[var(--accent-danger-text2)]">
                        {numberFormatter.format(stockShortage(row))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Sipariş ve satın alma kuyruğu">
          <div className="flex flex-wrap gap-2">
            <Link className={subtleButtonClass} href="/orders">
              <ClipboardList aria-hidden="true" className="size-4" />
              Siparişler
            </Link>
            <Link className={subtleButtonClass} href="/inventory">
              <Boxes aria-hidden="true" className="size-4" />
              Stok
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {summary.salesOrderReadiness.length === 0 &&
            snapshot.openPurchaseOrders.length === 0 &&
            purchaseRecommendations.length === 0 ? (
              <EmptyState>Açık sipariş bulunmuyor.</EmptyState>
            ) : null}

            {summary.salesOrderReadiness.slice(0, 4).map((item) => (
              <div
                className="rounded-md border border-[var(--border-table)] px-3 py-3"
                key={item.order.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.order.code}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {item.order.customerName} ·{" "}
                      {formatOrderLines(snapshot.products, item.order)}
                    </p>
                  </div>
                  <StatusBadge tone={item.isReady ? "success" : "danger"}>
                    {item.isReady ? "Hazır" : "Stok blokeli"}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {salesStatusLabel(item.order.status)} ·{" "}
                  {numberFormatter.format(item.units)} birim
                </p>
              </div>
            ))}

            {snapshot.openPurchaseOrders.slice(0, 4).map((order) => (
              <div
                className="rounded-md border border-[var(--border-table)] px-3 py-3"
                key={order.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{order.code}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {supplierName(snapshot.suppliers, order.supplierId)}
                    </p>
                  </div>
                  <StatusBadge tone="warning">
                    {purchaseStatusLabel(order.status)}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {numberFormatter.format(remainingPurchaseUnits(order))} birim
                  teslim bekliyor
                  {order.expectedDate ? ` · ${order.expectedDate}` : ""}
                </p>
              </div>
            ))}

            {purchaseRecommendations.slice(0, 4).map((recommendation) => (
              <div
                className="rounded-md border border-[var(--border-table)] px-3 py-3"
                key={recommendation.product.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{recommendation.product.sku}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {recommendation.product.name} ·{" "}
                      {recommendation.supplier?.name ?? "Tedarikçi seçilmedi"}
                    </p>
                  </div>
                  <StatusBadge
                    tone={
                      recommendation.urgency === "critical"
                        ? "danger"
                        : "warning"
                    }
                  >
                    Öneri
                  </StatusBadge>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {numberFormatter.format(recommendation.suggestedQuantity)} birim
                  öneriliyor · projeksiyon{" "}
                  {numberFormatter.format(recommendation.projectedAvailable)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Satın alma önerileri">
          {purchaseRecommendations.length === 0 ? (
            <EmptyState>Satın alma önerisi bulunmuyor.</EmptyState>
          ) : (
            <div className="space-y-3">
              {purchaseRecommendations.slice(0, 6).map((recommendation) => (
                <div
                  className="flex items-start justify-between gap-4 border-b border-[var(--border-table)] pb-3 last:border-0 last:pb-0"
                  key={recommendation.product.id}
                >
                  <div>
                    <p className="font-medium">{recommendation.product.name}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                      {recommendation.product.sku}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      Elde {numberFormatter.format(recommendation.onHand)} · açık
                      satış{" "}
                      {numberFormatter.format(recommendation.openSalesDemand)} ·
                      bekleyen teslim{" "}
                      {numberFormatter.format(recommendation.pendingInbound)}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge
                      tone={
                        recommendation.urgency === "critical"
                          ? "danger"
                          : "warning"
                      }
                    >
                      <ShoppingCart aria-hidden="true" className="mr-1 size-3" />
                      {numberFormatter.format(recommendation.suggestedQuantity)}
                    </StatusBadge>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {recommendation.supplier?.leadTimeDays
                        ? `${recommendation.supplier.leadTimeDays} gün`
                        : "Tedarikçi yok"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Yoğun hareket gören SKU'lar">
          {summary.topMovingProducts.length === 0 ? (
            <EmptyState>Henüz stok hareketi bulunmuyor.</EmptyState>
          ) : (
            <div className="space-y-3">
              {summary.topMovingProducts.map((item) => (
                <div
                  className="flex items-center justify-between gap-4 border-b border-[var(--border-table)] pb-3 last:border-0 last:pb-0"
                  key={item.product.id}
                >
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                      {item.product.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold">
                      {numberFormatter.format(item.movedUnits)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      net {formatSignedQuantity(item.netChange)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Son hareketler">
          {snapshot.stockMovements.length === 0 ? (
            <EmptyState>Henüz stok hareketi bulunmuyor.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="text-xs uppercase text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="py-2 pr-3">Tarih</th>
                    <th className="py-2 pr-3">Tip</th>
                    <th className="py-2 pr-3">Ürün</th>
                    <th className="py-2 pr-3">Depo</th>
                    <th className="py-2">Miktar</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.stockMovements.slice(0, 8).map((movement) => (
                    <tr
                      className="border-b border-[var(--border-table)] last:border-0"
                      key={movement.id}
                    >
                      <td className="py-3 pr-3 text-[var(--text-muted)]">
                        {formatDate(movement.createdAt)}
                      </td>
                      <td className="py-3 pr-3">
                        {movementLabel(movement.type)}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="font-medium">
                          {productName(snapshot.products, movement.productId)}
                        </span>
                        <span className="mt-1 block font-mono text-xs text-[var(--text-muted)]">
                          {productSku(snapshot.products, movement.productId)}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        {warehouseName(snapshot.warehouses, movement.warehouseId)}
                      </td>
                      <td className="py-3 font-mono font-semibold">
                        {formatSignedQuantity(movement.quantityChange)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Son sistem kayıtları">
          {snapshot.auditLogs.length === 0 ? (
            <EmptyState>Henüz sistem kaydı bulunmuyor.</EmptyState>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {snapshot.auditLogs.slice(0, 6).map((auditLog) => (
                <div
                  className="flex items-start gap-3 rounded-md border border-[var(--border-table)] px-3 py-3"
                  key={auditLog.id}
                >
                  <span className="mt-0.5 rounded-md bg-[var(--accent-info-bg)] p-2 text-[var(--accent-info-text)]">
                    <Activity aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium">{auditLog.summary}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {auditLog.entityType} · {formatDate(auditLog.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function SummaryMetric({
  caption,
  icon: Icon,
  value,
  tone = "neutral",
}: {
  caption: string;
  icon: ComponentType<LucideProps>;
  value: number;
  tone?: "neutral" | "warning" | "danger";
}) {
  return (
    <div className="rounded-md border border-[var(--border-table)] bg-[var(--bg-empty)] px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--text-muted)]">{caption}</span>
        <Icon
          aria-hidden="true"
          className={
            tone === "danger"
              ? "size-4 text-[var(--accent-danger-text2)]"
              : tone === "warning"
                ? "size-4 text-[var(--accent-warning-text2)]"
                : "size-4 text-[var(--accent-secondary)]"
          }
        />
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold">
        {numberFormatter.format(value)}
      </p>
    </div>
  );
}

function formatSignedQuantity(value: number) {
  return `${value > 0 ? "+" : ""}${numberFormatter.format(value)}`;
}

function formatOrderLines(products: Product[], order: SalesOrder) {
  return order.lines
    .map(
      (line) =>
        `${productSku(products, line.productId)} x ${numberFormatter.format(
          line.quantity,
        )}`,
    )
    .join(", ");
}

function remainingPurchaseUnits(order: PurchaseOrder) {
  return order.lines.reduce(
    (total, line) =>
      total + Math.max(0, line.quantity - line.receivedQuantity),
    0,
  );
}
