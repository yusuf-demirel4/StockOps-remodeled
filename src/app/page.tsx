import {
  AlertTriangle,
  ClipboardList,
  PackageCheck,
  PackageSearch,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, Panel, StatCard, StatusBadge } from "@/components/ui";
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
} from "@/lib/format";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);
  const totalOnHand = snapshot.stockRows.reduce(
    (total, row) => total + row.onHand,
    0,
  );

  return (
    <AppShell
      description="Ürün, stok, satış ve satın alma akışlarının canlı özeti."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Dashboard"
      userName={snapshot.user.name}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          caption="Aktif ürün sayısı"
          icon={PackageSearch}
          title="Ürün"
          value={snapshot.products.length}
        />
        <StatCard
          caption="Tüm depolardaki toplam"
          icon={PackageCheck}
          title="Stok"
          tone="success"
          value={numberFormatter.format(totalOnHand)}
        />
        <StatCard
          caption="Minimum seviyede veya altında"
          icon={AlertTriangle}
          title="Kritik stok"
          tone={snapshot.criticalRows.length > 0 ? "critical" : "success"}
          value={snapshot.criticalRows.length}
        />
        <StatCard
          caption="Satış ve satın alma bekleyenleri"
          icon={ClipboardList}
          title="Açık sipariş"
          tone="warning"
          value={
            snapshot.openSalesOrders.length + snapshot.openPurchaseOrders.length
          }
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Kritik stok">
          {snapshot.criticalRows.length === 0 ? (
            <EmptyState>Kritik stok bulunmuyor.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-xs uppercase text-[#6a746f]">
                  <tr className="border-b border-[#e3e5dd]">
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Ürün</th>
                    <th className="py-2 pr-3">Depo</th>
                    <th className="py-2 pr-3">Stok</th>
                    <th className="py-2">Minimum</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.criticalRows.slice(0, 8).map((row) => (
                    <tr
                      className="border-b border-[#eef0ea] last:border-0"
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
                        <StatusBadge tone="danger">{row.onHand}</StatusBadge>
                      </td>
                      <td className="py-3">{row.minimumStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Son hareketler">
          <div className="space-y-3">
            {snapshot.stockMovements.slice(0, 7).map((movement) => (
              <div
                className="flex items-start justify-between gap-4 rounded-md border border-[#edf0e8] bg-[#fafbf7] px-3 py-2.5"
                key={movement.id}
              >
                <div>
                  <p className="font-medium">
                    {productName(snapshot.products, movement.productId)}
                  </p>
                  <p className="mt-1 text-xs text-[#68736d]">
                    {movementLabel(movement.type)} ·{" "}
                    {warehouseName(snapshot.warehouses, movement.warehouseId)} ·{" "}
                    {formatDate(movement.createdAt)}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold">
                  {movement.quantityChange > 0 ? "+" : ""}
                  {movement.quantityChange}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Açık satış siparişleri">
          <div className="space-y-3">
            {snapshot.openSalesOrders.map((order) => (
              <div
                className="rounded-md border border-[#edf0e8] px-3 py-3"
                key={order.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{order.code}</p>
                    <p className="text-sm text-[#66706b]">
                      {order.customerName}
                    </p>
                  </div>
                  <StatusBadge>{salesStatusLabel(order.status)}</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-[#4d5752]">
                  {order.lines
                    .map(
                      (line) =>
                        `${productSku(snapshot.products, line.productId)} x ${line.quantity}`,
                    )
                    .join(", ")}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Açık satın alma siparişleri">
          <div className="space-y-3">
            {snapshot.openPurchaseOrders.map((order) => (
              <div
                className="rounded-md border border-[#edf0e8] px-3 py-3"
                key={order.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{order.code}</p>
                    <p className="text-sm text-[#66706b]">
                      {supplierName(snapshot.suppliers, order.supplierId)}
                    </p>
                  </div>
                  <StatusBadge tone="warning">
                    {purchaseStatusLabel(order.status)}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-sm text-[#4d5752]">
                  {order.lines
                    .map(
                      (line) =>
                        `${productSku(snapshot.products, line.productId)} x ${line.quantity}`,
                    )
                    .join(", ")}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
