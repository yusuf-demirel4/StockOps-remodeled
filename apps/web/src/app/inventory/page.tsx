import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  buttonClass,
  inputClass,
  Panel,
  selectClass,
  StatusBadge,
} from "@/components/ui";
import { createStockMovementAction } from "@/lib/actions";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import {
  formatDate,
  movementLabel,
  productName,
  productSku,
  warehouseName,
} from "@stockops/core/format";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

  return (
    <AppShell
      description="Giriş, çıkış, düzeltme ve hareket geçmişi."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Stok"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Panel title="Stok hareketi">
          <form action={createStockMovementAction} className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Barkod / hızlı giriş
              <input
                className={inputClass}
                name="barcode"
                placeholder="USB okuyucu ile okut"
              />
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
              Depo
              <select className={selectClass} name="warehouseId" required>
                {snapshot.warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Hareket tipi
              <select className={selectClass} name="type" required>
                <option value="INBOUND">Giriş</option>
                <option value="OUTBOUND">Çıkış</option>
                <option value="ADJUSTMENT">Düzeltme</option>
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
            <label className="grid gap-1.5 text-sm font-medium">
              Not
              <input className={inputClass} name="note" />
            </label>
            <button className={buttonClass} type="submit">
              <Plus aria-hidden="true" className="size-4" />
              Hareket kaydet
            </button>
          </form>
        </Panel>

        <div className="grid gap-6">
          <Panel title="Mevcut stok">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-[#6a746f]">
                  <tr className="border-b border-[#e3e5dd]">
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Ürün</th>
                    <th className="py-2 pr-3">Depo</th>
                    <th className="py-2 pr-3">Eldeki stok</th>
                    <th className="py-2">Minimum</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.stockRows.map((row) => (
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
                        <StatusBadge tone={row.isCritical ? "danger" : "success"}>
                          {row.onHand}
                        </StatusBadge>
                      </td>
                      <td className="py-3">{row.minimumStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Hareket geçmişi">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="text-xs uppercase text-[#6a746f]">
                  <tr className="border-b border-[#e3e5dd]">
                    <th className="py-2 pr-3">Tarih</th>
                    <th className="py-2 pr-3">Tip</th>
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Ürün</th>
                    <th className="py-2 pr-3">Depo</th>
                    <th className="py-2">Miktar</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.stockMovements.map((movement) => (
                    <tr
                      className="border-b border-[#eef0ea] last:border-0"
                      key={movement.id}
                    >
                      <td className="py-3 pr-3 text-[#65706b]">
                        {formatDate(movement.createdAt)}
                      </td>
                      <td className="py-3 pr-3">
                        {movementLabel(movement.type)}
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs">
                        {productSku(snapshot.products, movement.productId)}
                      </td>
                      <td className="py-3 pr-3 font-medium">
                        {productName(snapshot.products, movement.productId)}
                      </td>
                      <td className="py-3 pr-3">
                        {warehouseName(snapshot.warehouses, movement.warehouseId)}
                      </td>
                      <td className="py-3 font-mono font-semibold">
                        {movement.quantityChange > 0 ? "+" : ""}
                        {movement.quantityChange}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
