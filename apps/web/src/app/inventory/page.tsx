import { AppShell } from "@/components/app-shell";
import {
  StockMovementForm,
  StockTransferForm,
} from "@/components/inventory-form";
import { Panel, StatusBadge } from "@/components/ui";
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
  const activeProducts = snapshot.products.filter((product) => product.isActive);

  return (
    <AppShell
      description="Giriş, çıkış, transfer, düzeltme ve hareket geçmişi."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Stok"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="grid gap-6">
          <Panel title="Stok hareketi">
            <StockMovementForm
              products={activeProducts}
              warehouses={snapshot.warehouses}
            />
          </Panel>

          <Panel title="Depolar arası transfer">
            <StockTransferForm
              products={activeProducts}
              warehouses={snapshot.warehouses}
            />
          </Panel>
        </div>

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
