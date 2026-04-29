import { CloudOff } from "lucide-react";

export const metadata = {
  title: "Çevrimdışı — StockOps",
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 pt-16 text-center">
      <CloudOff aria-hidden="true" className="size-16 text-amber-400" />
      <h1 className="text-2xl font-semibold">Çevrimdışısınız</h1>
      <p className="text-sm text-slate-400">
        Bağlantı yokken yeni veri yüklenemez. Sayım sayfası kuyruğa kaydederek çalışmaya
        devam etmenize izin verir.
      </p>
      <a
        className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white"
        href="/mobile/stocktake"
      >
        Sayıma git
      </a>
    </div>
  );
}
