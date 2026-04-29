import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { StocktakeForm } from "@/components/mobile/stocktake-form";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function MobileStocktakePage() {
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
        <h1 className="text-2xl font-semibold">Sayim</h1>
        <p className="mt-1 text-sm text-slate-400">
          Urunu tara, fiziksel miktari gir, cevrimdisiyken kuyruga al.
        </p>
      </header>
      <StocktakeForm
        products={snapshot.products.filter((product) => product.isActive)}
        stockRows={snapshot.stockRows}
        warehouses={snapshot.warehouses}
      />
    </div>
  );
}
