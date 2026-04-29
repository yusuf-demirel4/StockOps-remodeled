import { AppShell } from "@/components/app-shell";
import {
  BomCreateForm,
  ManufacturingOrderCreateForm,
  StartManufacturingButton,
  CompleteManufacturingButton,
} from "@/components/manufacturing-forms";
import { Panel, StatusBadge, EmptyState } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import { manufacturingStatusLabel } from "@stockops/core/format";

export const dynamic = "force-dynamic";

function moStatusTone(status: string) {
  switch (status) {
    case "DRAFT":
      return "neutral";
    case "IN_PROGRESS":
      return "warning";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

export default async function ManufacturingPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

  return (
    <AppShell
      description="Ürün reçeteleri (BOM) ve üretim emirleri."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Üretim"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* Left column: forms */}
        <div className="grid gap-6 self-start">
          <Panel title="Yeni ürün reçetesi (BOM)">
            <BomCreateForm products={snapshot.products} />
          </Panel>

          {snapshot.billsOfMaterial.length > 0 && (
            <Panel title="Yeni üretim emri">
              <ManufacturingOrderCreateForm
                boms={snapshot.billsOfMaterial}
                warehouses={snapshot.warehouses}
                products={snapshot.products}
              />
            </Panel>
          )}
        </div>

        {/* Right column: lists */}
        <div className="grid gap-6 self-start">
          {/* BOM List */}
          <Panel title="Ürün reçeteleri">
            {snapshot.billsOfMaterial.length === 0 ? (
              <EmptyState>Henüz ürün reçetesi yok. Sol taraftan yeni bir reçete oluşturun.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="text-xs uppercase text-[var(--text-secondary)]">
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-2 pr-3">Mamul</th>
                      <th className="py-2 pr-3">Reçete</th>
                      <th className="py-2 pr-3">Bileşenler</th>
                      <th className="py-2 pr-3">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.billsOfMaterial.map((bom) => {
                      const product = snapshot.products.find((p) => p.id === bom.productId);
                      return (
                        <tr
                          key={bom.id}
                          className="border-b border-[var(--border-table)] align-top last:border-0"
                        >
                          <td className="py-3 pr-3">
                            <span className="font-mono text-xs">{product?.sku ?? "?"}</span>
                            <br />
                            <span className="text-[var(--text-secondary)]">{product?.name}</span>
                          </td>
                          <td className="py-3 pr-3 font-medium">{bom.name}</td>
                          <td className="py-3 pr-3">
                            <ul className="space-y-0.5">
                              {bom.components.map((c) => {
                                const compProduct = snapshot.products.find(
                                  (p) => p.id === c.componentProductId,
                                );
                                return (
                                  <li key={c.id} className="text-xs text-[var(--text-secondary)]">
                                    <span className="font-mono">{compProduct?.sku ?? "?"}</span>{" "}
                                    <span className="text-[var(--text-primary)]">
                                      x{c.quantity}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </td>
                          <td className="py-3 pr-3">
                            <StatusBadge tone={bom.isActive ? "success" : "danger"}>
                              {bom.isActive ? "Aktif" : "Pasif"}
                            </StatusBadge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Manufacturing Orders */}
          <Panel title="Üretim emirleri">
            {snapshot.manufacturingOrders.length === 0 ? (
              <EmptyState>
                Henüz üretim emri yok. Önce bir reçete oluşturun, ardından üretim emri verebilirsiniz.
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="text-xs uppercase text-[var(--text-secondary)]">
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-2 pr-3">Emir No</th>
                      <th className="py-2 pr-3">Mamul</th>
                      <th className="py-2 pr-3">Miktar</th>
                      <th className="py-2 pr-3">Depo</th>
                      <th className="py-2 pr-3">Durum</th>
                      <th className="py-2">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.manufacturingOrders.map((mo) => {
                      const bom = snapshot.billsOfMaterial.find((b) => b.id === mo.bomId);
                      const product = bom
                        ? snapshot.products.find((p) => p.id === bom.productId)
                        : undefined;
                      const warehouse = snapshot.warehouses.find((w) => w.id === mo.warehouseId);
                      return (
                        <tr
                          key={mo.id}
                          className="border-b border-[var(--border-table)] align-top last:border-0"
                        >
                          <td className="py-3 pr-3 font-mono text-xs">{mo.code}</td>
                          <td className="py-3 pr-3">
                            <span className="font-mono text-xs">{product?.sku ?? "?"}</span>
                            <br />
                            <span className="text-[var(--text-secondary)]">{product?.name}</span>
                          </td>
                          <td className="py-3 pr-3">{mo.quantity}</td>
                          <td className="py-3 pr-3 text-[var(--text-secondary)]">
                            {warehouse?.name ?? "?"}
                          </td>
                          <td className="py-3 pr-3">
                            <StatusBadge tone={moStatusTone(mo.status)}>
                              {manufacturingStatusLabel(mo.status)}
                            </StatusBadge>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              {mo.status === "DRAFT" && <StartManufacturingButton moId={mo.id} />}
                              {mo.status === "IN_PROGRESS" && (
                                <CompleteManufacturingButton moId={mo.id} />
                              )}
                            </div>
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
      </div>
    </AppShell>
  );
}
