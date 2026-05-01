import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  ConfirmSalesOrderForm,
  PurchaseOrderForm,
  ReceivePurchaseOrderForm,
  SalesOrderForm,
} from "@/components/order-forms";
import {
  ApproveReturnForm,
  CreateReturnDisclosure,
} from "@/components/return-forms";
import { EmptyState, Panel, StatusBadge, buttonClass, subtleButtonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import {
  numberFormatter,
  productSku,
  purchaseStatusLabel,
  salesStatusLabel,
  supplierName,
} from "@stockops/core/format";
import { buildPurchaseRecommendations } from "@stockops/core/purchase-recommendations";
import { Download } from "lucide-react";

const returnStatusTone: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  DRAFT: "warning",
  APPROVED: "neutral",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const returnStatusLabel: Record<string, string> = {
  DRAFT: "Taslak",
  APPROVED: "Onaylandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);
  const activeProducts = snapshot.products.filter((product) => product.isActive);
  const purchaseRecommendations = buildPurchaseRecommendations(snapshot);

  return (
    <AppShell
      description="Satış siparişi stok düşer, satın alma teslimi stok artırır."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Siparişler"
      userName={snapshot.user.name}
    >
      <div className="mb-6 flex justify-end gap-2">
        <a
          href="/api/export/orders"
          className={subtleButtonClass}
          download="siparisler.csv"
        >
          <Download className="size-4" />
          CSV İndir
        </a>
        <Link className={buttonClass} href="/orders/new">
          Yeni Sipariş
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Satış siparişi">
          <SalesOrderForm products={activeProducts} />
        </Panel>

        <Panel title="Satın alma siparişi">
          <PurchaseOrderForm
            products={activeProducts}
            suppliers={snapshot.suppliers}
          />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Satın alma önerileri">
          {purchaseRecommendations.length === 0 ? (
            <EmptyState>Satın alma önerisi bulunmuyor.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Ürün</th>
                    <th className="py-2 pr-3">Tedarikçi</th>
                    <th className="py-2 pr-3">Eldeki</th>
                    <th className="py-2 pr-3">Açık satış</th>
                    <th className="py-2 pr-3">Bekleyen teslim</th>
                    <th className="py-2 pr-3">Projeksiyon</th>
                    <th className="py-2">Öneri</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseRecommendations.map((recommendation) => (
                    <tr
                      className="border-b border-[var(--border-table)] last:border-0"
                      key={recommendation.product.id}
                    >
                      <td className="py-3 pr-3 font-mono text-xs">
                        {recommendation.product.sku}
                      </td>
                      <td className="py-3 pr-3 font-medium">
                        {recommendation.product.name}
                      </td>
                      <td className="py-3 pr-3">
                        {recommendation.supplier?.name ?? "-"}
                      </td>
                      <td className="py-3 pr-3">
                        {numberFormatter.format(recommendation.onHand)}
                      </td>
                      <td className="py-3 pr-3">
                        {numberFormatter.format(recommendation.openSalesDemand)}
                      </td>
                      <td className="py-3 pr-3">
                        {numberFormatter.format(recommendation.pendingInbound)}
                      </td>
                      <td className="py-3 pr-3">
                        {numberFormatter.format(
                          recommendation.projectedAvailable,
                        )}
                      </td>
                      <td className="py-3">
                        <StatusBadge
                          tone={
                            recommendation.urgency === "critical"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {numberFormatter.format(
                            recommendation.suggestedQuantity,
                          )}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Satış siparişleri">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-2 pr-3">Kod</th>
                  <th className="py-2 pr-3">Müşteri</th>
                  <th className="py-2 pr-3">Satırlar</th>
                  <th className="py-2 pr-3">Durum</th>
                  <th className="py-2">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.salesOrders.map((order) => (
                  <tr
                    className="border-b border-[var(--border-table)] align-top last:border-0"
                    key={order.id}
                  >
                    <td className="py-3 pr-3 font-mono text-xs">
                      <Link href={`/orders/${order.id}`} className="text-[var(--accent-primary)] hover:underline">
                        {order.code}
                      </Link>
                    </td>
                    <td className="py-3 pr-3 font-medium">
                      {order.customerName}
                    </td>
                    <td className="py-3 pr-3">
                      {order.lines
                        .map(
                          (line) =>
                            `${productSku(snapshot.products, line.productId)} x ${line.quantity}`,
                        )
                        .join(", ")}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge
                        tone={order.status === "CONFIRMED" ? "success" : "neutral"}
                      >
                        {salesStatusLabel(order.status)}
                      </StatusBadge>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-start gap-2">
                        {order.status === "DRAFT" ? (
                          <ConfirmSalesOrderForm orderId={order.id} />
                        ) : null}
                        {order.status === "CONFIRMED" ? (
                          <CreateReturnDisclosure
                            order={order}
                            products={snapshot.products}
                          />
                        ) : null}
                        {order.status !== "DRAFT" &&
                        order.status !== "CONFIRMED" ? (
                          <span className="text-xs text-[var(--placeholder)]">-</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Satın alma siparişleri">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-2 pr-3">Kod</th>
                  <th className="py-2 pr-3">Tedarikçi</th>
                  <th className="py-2 pr-3">Satırlar</th>
                  <th className="py-2 pr-3">Durum</th>
                  <th className="py-2">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.purchaseOrders.map((order) => (
                  <tr
                    className="border-b border-[var(--border-table)] align-top last:border-0"
                    key={order.id}
                  >
                    <td className="py-3 pr-3 font-mono text-xs">{order.code}</td>
                    <td className="py-3 pr-3 font-medium">
                      {supplierName(snapshot.suppliers, order.supplierId)}
                    </td>
                    <td className="py-3 pr-3">
                      {order.lines
                        .map(
                          (line) =>
                            `${productSku(snapshot.products, line.productId)} x ${line.receivedQuantity}/${line.quantity}`,
                        )
                        .join(", ")}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge
                        tone={order.status === "COMPLETED" ? "success" : "warning"}
                      >
                        {purchaseStatusLabel(order.status)}
                      </StatusBadge>
                    </td>
                    <td className="py-3">
                      {order.status !== "COMPLETED" ? (
                        <ReceivePurchaseOrderForm orderId={order.id} />
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="İadeler">
          {snapshot.salesReturns.length === 0 ? (
            <EmptyState>
              Henüz iade talebi yok. Onaylanmış siparişlerden iade
              oluşturabilirsiniz.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="py-2 pr-3">Kod</th>
                    <th className="py-2 pr-3">Sipariş</th>
                    <th className="py-2 pr-3">Satırlar</th>
                    <th className="py-2 pr-3">Sebep</th>
                    <th className="py-2 pr-3">Durum</th>
                    <th className="py-2">Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.salesReturns.map((salesReturn) => {
                    const order = snapshot.salesOrders.find(
                      (item) => item.id === salesReturn.salesOrderId,
                    );
                    return (
                      <tr
                        className="border-b border-[var(--border-table)] align-top last:border-0"
                        key={salesReturn.id}
                      >
                        <td className="py-3 pr-3 font-mono text-xs">
                          {salesReturn.code}
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs">
                          {order?.code ?? salesReturn.salesOrderId}
                        </td>
                        <td className="py-3 pr-3">
                          {salesReturn.lines
                            .map(
                              (line) =>
                                `${productSku(snapshot.products, line.productId)} x ${numberFormatter.format(line.quantity)}`,
                            )
                            .join(", ")}
                        </td>
                        <td className="py-3 pr-3 text-[var(--neutral-badge-text)]">
                          {salesReturn.reason ?? "-"}
                        </td>
                        <td className="py-3 pr-3">
                          <StatusBadge
                            tone={
                              returnStatusTone[salesReturn.status] ?? "neutral"
                            }
                          >
                            {returnStatusLabel[salesReturn.status] ??
                              salesReturn.status}
                          </StatusBadge>
                        </td>
                        <td className="py-3">
                          {salesReturn.status === "DRAFT" ? (
                            <ApproveReturnForm returnId={salesReturn.id} />
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
