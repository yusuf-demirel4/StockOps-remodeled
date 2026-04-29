import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { MobilePickList } from "@/components/mobile/pick-list";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot, getSalesOrderDetails } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function MobilePickPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);
  const confirmedOrders = snapshot.salesOrders.filter(
    (order) => order.status === "CONFIRMED",
  );
  const pickingOrders = snapshot.salesOrders.filter(
    (order) => order.status === "PICKING",
  );
  const pickingJobs = (
    await Promise.all(
      pickingOrders.map(async (order) => {
        const details = await getSalesOrderDetails(order.id, context);
        return details.pickLists.map(
          (pickList: {
            id: string;
            status: string;
            items: Array<{
              id: string;
              pickListId: string;
              productId: string;
              quantity: number;
              pickedQty: number;
              binLocation?: string | null;
              product: {
                id: string;
                sku: string;
                name: string;
                barcode?: string | null;
              };
            }>;
          }) => ({
            orderId: order.id,
            orderCode: order.code,
            customerName: order.customerName,
            pickListId: pickList.id,
            status: pickList.status,
            items: pickList.items,
          }),
        );
      }),
    )
  ).flat();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Link
        className="inline-flex items-center gap-2 text-sm text-slate-400"
        href="/mobile"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Mobil ana ekran
      </Link>
      <header>
        <p className="text-xs uppercase tracking-widest text-slate-500">WMS</p>
        <h1 className="text-2xl font-semibold">Topla</h1>
        <p className="mt-1 text-sm text-slate-400">
          Siparisi baslat, urunleri barkodla isaretle, sonra paketlemeye gonder.
        </p>
      </header>
      <MobilePickList
        confirmedOrders={confirmedOrders}
        pickingJobs={pickingJobs}
      />
    </div>
  );
}
