import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ReceiveList } from "@/components/mobile/receive-list";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function MobileReceivePage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

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
        <h1 className="text-2xl font-semibold">Teslim al</h1>
        <p className="mt-1 text-sm text-slate-400">
          Urun barkodunu tara, acik satin alma siparisini bul ve teslimi onayla.
        </p>
      </header>
      <ReceiveList
        orders={snapshot.openPurchaseOrders}
        products={snapshot.products}
        suppliers={snapshot.suppliers}
      />
    </div>
  );
}
