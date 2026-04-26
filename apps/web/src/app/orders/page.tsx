import { AppShell } from "@/components/app-shell";
import {
  ConfirmSalesOrderForm,
  PurchaseOrderForm,
  ReceivePurchaseOrderForm,
  SalesOrderForm,
} from "@/components/order-forms";
import { Panel, StatusBadge } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import {
  productSku,
  purchaseStatusLabel,
  salesStatusLabel,
  supplierName,
} from "@stockops/core/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);
  const activeProducts = snapshot.products.filter((product) => product.isActive);

  return (
    <AppShell
      description="Satış siparişi stok düşer, satın alma teslimi stok artırır."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Siparişler"
      userName={snapshot.user.name}
    >
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

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Satış siparişleri">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-[#6a746f]">
                <tr className="border-b border-[#e3e5dd]">
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
                    className="border-b border-[#eef0ea] align-top last:border-0"
                    key={order.id}
                  >
                    <td className="py-3 pr-3 font-mono text-xs">{order.code}</td>
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
                      {order.status === "DRAFT" ? (
                        <ConfirmSalesOrderForm orderId={order.id} />
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

        <Panel title="Satın alma siparişleri">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase text-[#6a746f]">
                <tr className="border-b border-[#e3e5dd]">
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
                    className="border-b border-[#eef0ea] align-top last:border-0"
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
    </AppShell>
  );
}
