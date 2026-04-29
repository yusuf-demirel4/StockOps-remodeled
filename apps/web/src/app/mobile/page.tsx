import { ClipboardCheck, PackageCheck, Scan } from "lucide-react";
import Link from "next/link";

import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function MobileHomePage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

  const openPurchaseOrders = snapshot.openPurchaseOrders.length;
  const openSalesOrders = snapshot.openSalesOrders.filter(
    (order) => order.status === "CONFIRMED" || order.status === "PICKING",
  ).length;
  const criticalRows = snapshot.criticalRows.length;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-slate-400">
          {snapshot.organization.name}
        </span>
        <h1 className="text-2xl font-semibold">Merhaba, {snapshot.user.name.split(" ")[0]}</h1>
        <p className="text-sm text-slate-400">Mobil depo operasyonları</p>
      </header>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Teslim alınacak" value={openPurchaseOrders} accent="indigo" />
        <Stat label="Toplanacak" value={openSalesOrders} accent="amber" />
        <Stat label="Kritik stok" value={criticalRows} accent="rose" />
      </div>

      <div className="grid gap-3">
        <ActionTile
          accent="from-indigo-500/20 to-indigo-500/5"
          description="Satınalma siparişlerini barkod tarayarak teslim al"
          href="/mobile/receive"
          icon={<PackageCheck aria-hidden="true" className="size-7" />}
          title="Teslim al"
        />
        <ActionTile
          accent="from-amber-500/20 to-amber-500/5"
          description="Açık toplama listelerini tara, miktarları işaretle"
          href="/mobile/pick"
          icon={<ClipboardCheck aria-hidden="true" className="size-7" />}
          title="Topla"
        />
        <ActionTile
          accent="from-emerald-500/20 to-emerald-500/5"
          description="Ürünü tara, sayımı kaydet (çevrimdışı destekli)"
          href="/mobile/stocktake"
          icon={<Scan aria-hidden="true" className="size-7" />}
          title="Sayım"
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "indigo" | "amber" | "rose";
}) {
  const colors = {
    indigo: "text-indigo-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
  } as const;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 px-2 py-3">
      <div className={`text-2xl font-bold ${colors[accent]}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
    </div>
  );
}

function ActionTile({
  accent,
  description,
  href,
  icon,
  title,
}: {
  accent: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Link
      className={`flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-5 transition active:scale-[0.98]`}
      href={href}
    >
      <div className="flex size-14 items-center justify-center rounded-xl bg-slate-950/60 text-indigo-300">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-xs text-slate-400">{description}</div>
      </div>
    </Link>
  );
}
