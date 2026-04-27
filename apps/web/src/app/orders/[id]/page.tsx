import Link from "next/link";
import { ArrowLeft, CheckCircle2, Truck, Package, PackageCheck, ClipboardList, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Panel, StatusBadge } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot, getSalesOrderDetails } from "@/lib/repository";
import { salesStatusLabel } from "@stockops/core/format";
import { PickListForm } from "@/components/pick-list-form";
import { ShipmentForm } from "@/components/shipment-form";
import { StartPickingForm, MarkPackedForm, DeliverOrderForm } from "@/components/order-actions";
import { SalesOrderStatus } from "@stockops/core/types";

export const dynamic = "force-dynamic";

const STAGES: { id: SalesOrderStatus; label: string; icon: React.ElementType }[] = [
  { id: "DRAFT", label: "Taslak", icon: ClipboardList },
  { id: "CONFIRMED", label: "Onaylandı", icon: CheckCircle2 },
  { id: "PICKING", label: "Toplanıyor", icon: Package },
  { id: "PACKED", label: "Paketlendi", icon: PackageCheck },
  { id: "SHIPPED", label: "Kargoya Verildi", icon: Truck },
  { id: "DELIVERED", label: "Teslim Edildi", icon: Check },
];

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);
  const { order, pickLists } = await getSalesOrderDetails(id, context);

  const currentStageIndex = STAGES.findIndex((s) => s.id === order.status);
  const isCancelled = order.status === "CANCELLED";

  const activePickList = pickLists.find(pl => pl.status !== "COMPLETED" && pl.status !== "CANCELLED") || pickLists[0];
  const activeShipment = order.shipments?.find((s: { status: string }) => s.status !== "RETURNED") || order.shipments?.[0];

  return (
    <AppShell
      description="Sipariş detayları ve yerine getirme süreci."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title={`Sipariş: ${order.code}`}
      userName={snapshot.user.name}
    >
      <div className="mb-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#66706b] hover:text-[#27322e]"
        >
          <ArrowLeft className="size-4" />
          Siparişlere Dön
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Timeline & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <Panel title="Sipariş Durumu" className="overflow-hidden">
            <div className="relative py-4">
              {isCancelled ? (
                <div className="rounded-md bg-[#ffe1d9] p-4 text-[#a23922]">
                  Bu sipariş iptal edilmiştir.
                </div>
              ) : (
                <div className="flex justify-between relative px-2">
                  <div className="absolute top-5 left-8 right-8 h-0.5 bg-[#e3e5dd] -z-10" />
                  <div
                    className="absolute top-5 left-8 h-0.5 bg-[#236d5a] -z-10 transition-all duration-500"
                    style={{ width: `calc(${(Math.max(0, currentStageIndex) / (STAGES.length - 1)) * 100}% - 4rem)` }}
                  />

                  {STAGES.map((stage, index) => {
                    const isCompleted = index < currentStageIndex || order.status === "DELIVERED";
                    const isActive = index === currentStageIndex;
                    const Icon = stage.icon;

                    return (
                      <div key={stage.id} className="flex flex-col items-center gap-3">
                        <div
                          className={`flex size-10 items-center justify-center rounded-full border-2 bg-white transition-colors ${
                            isCompleted
                              ? "border-[#236d5a] text-[#236d5a]"
                              : isActive
                                ? "border-[#236d5a] text-[#236d5a] ring-4 ring-[#236d5a]/20"
                                : "border-[#cfd3c8] text-[#8a938e]"
                          }`}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div className="text-center">
                          <p
                            className={`text-sm font-semibold ${
                              isActive ? "text-[#1f2523]" : isCompleted ? "text-[#3b4741]" : "text-[#8a938e]"
                            }`}
                          >
                            {stage.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons based on state */}
            {!isCancelled && order.status !== "DELIVERED" && (
              <div className="mt-6 border-t border-[#e3e5dd] pt-6 flex justify-end gap-3">
                {order.status === "CONFIRMED" && <StartPickingForm orderId={order.id} />}
                {order.status === "PICKING" && <MarkPackedForm orderId={order.id} />}
                {order.status === "SHIPPED" && <DeliverOrderForm orderId={order.id} />}
              </div>
            )}
          </Panel>

          {/* Dynamic Panel based on current stage */}
          {order.status === "PICKING" && activePickList && (
            <Panel title={`Toplama Listesi (${activePickList.id.split('-')[0]})`}>
              <PickListForm
                pickListId={activePickList.id}
                items={activePickList.items}
              />
            </Panel>
          )}

          {order.status === "PACKED" && (
            <Panel title="Kargo Bilgileri Girin">
              <ShipmentForm orderId={order.id} />
            </Panel>
          )}

          {["SHIPPED", "DELIVERED"].includes(order.status) && activeShipment && (
            <Panel title="Kargo Durumu">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-[#8a938e] uppercase tracking-wider">Firma</p>
                  <p className="font-medium text-[#1f2523] mt-1">{activeShipment.carrier || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8a938e] uppercase tracking-wider">Takip No</p>
                  <p className="font-medium text-[#1f2523] mt-1">{activeShipment.trackingNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8a938e] uppercase tracking-wider">Paket / Ağırlık</p>
                  <p className="font-medium text-[#1f2523] mt-1">
                    {activeShipment.packageCount} Adet {activeShipment.weight ? `/ ${Number(activeShipment.weight)} kg` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#8a938e] uppercase tracking-wider">Durum</p>
                  <div className="mt-1">
                    <StatusBadge tone={activeShipment.status === "DELIVERED" ? "success" : "neutral"}>
                      {activeShipment.status}
                    </StatusBadge>
                  </div>
                </div>
              </div>
              {activeShipment.trackingUrl && (
                <div className="mt-4 pt-4 border-t border-[#e3e5dd]">
                  <a
                    href={activeShipment.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#236d5a] font-medium text-sm hover:underline"
                  >
                    Kargoyu Takip Et &rarr;
                  </a>
                </div>
              )}
            </Panel>
          )}
        </div>

        {/* Right Column: Order Details Summary */}
        <div className="space-y-6">
          <Panel title="Sipariş Özeti">
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-[#e3e5dd] pb-3">
                <span className="text-[#66706b]">Müşteri</span>
                <span className="font-medium text-[#1f2523]">{order.customerName}</span>
              </div>
              <div className="flex justify-between border-b border-[#e3e5dd] pb-3">
                <span className="text-[#66706b]">Tarih</span>
                <span className="font-medium text-[#1f2523]">
                  {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                </span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-[#66706b]">Sipariş Durumu</span>
                <StatusBadge tone={order.status === "CONFIRMED" ? "success" : "neutral"}>
                  {salesStatusLabel(order.status)}
                </StatusBadge>
              </div>
            </div>
          </Panel>

          <Panel title="Sipariş Kalemleri">
            <ul className="divide-y divide-[#e3e5dd]">
              {order.lines.map((line: { id: string; product: { name: string; sku: string }; quantity: number }) => (
                <li key={line.id} className="py-3 first:pt-0 last:pb-0 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-[#1f2523] text-sm">
                      {line.product.name}
                    </p>
                    <p className="text-xs text-[#8a938e] font-mono mt-0.5">
                      {line.product.sku}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#3b4741] bg-[#eef0ea] px-2 py-1 rounded-md">
                    {line.quantity} Adet
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
