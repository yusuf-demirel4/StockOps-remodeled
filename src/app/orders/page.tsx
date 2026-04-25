import { Check, Plus, Truck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  buttonClass,
  inputClass,
  Panel,
  selectClass,
  StatusBadge,
  subtleButtonClass,
} from "@/components/ui";
import {
  confirmSalesOrderAction,
  createPurchaseOrderAction,
  createSalesOrderAction,
  receivePurchaseOrderAction,
} from "@/lib/actions";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import {
  productSku,
  purchaseStatusLabel,
  salesStatusLabel,
  supplierName,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

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
          <form action={createSalesOrderAction} className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Müşteri
              <input className={inputClass} name="customerName" required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Ürün
              <select className={selectClass} name="productId" required>
                {snapshot.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} · {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Miktar
              <input
                className={inputClass}
                min="1"
                name="quantity"
                required
                type="number"
              />
            </label>
            <button className={buttonClass} type="submit">
              <Plus aria-hidden="true" className="size-4" />
              Satış oluştur
            </button>
          </form>
        </Panel>

        <Panel title="Satın alma siparişi">
          <form action={createPurchaseOrderAction} className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Tedarikçi
              <select className={selectClass} name="supplierId" required>
                {snapshot.suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Ürün
              <select className={selectClass} name="productId" required>
                {snapshot.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} · {product.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Miktar
                <input
                  className={inputClass}
                  min="1"
                  name="quantity"
                  required
                  type="number"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Beklenen tarih
                <input className={inputClass} name="expectedDate" type="date" />
              </label>
            </div>
            <button className={buttonClass} type="submit">
              <Truck aria-hidden="true" className="size-4" />
              Satın alma oluştur
            </button>
          </form>
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
                    className="border-b border-[#eef0ea] last:border-0"
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
                        <form action={confirmSalesOrderAction}>
                          <input name="orderId" type="hidden" value={order.id} />
                          <button className={subtleButtonClass} type="submit">
                            <Check aria-hidden="true" className="size-4" />
                            Onayla
                          </button>
                        </form>
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
                    className="border-b border-[#eef0ea] last:border-0"
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
                        <form action={receivePurchaseOrderAction}>
                          <input name="orderId" type="hidden" value={order.id} />
                          <button className={subtleButtonClass} type="submit">
                            <Check aria-hidden="true" className="size-4" />
                            Teslim al
                          </button>
                        </form>
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
