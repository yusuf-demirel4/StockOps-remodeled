"use client";

import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { recordStocktakeAction } from "@/lib/actions";
import { enqueue, listQueue, removeFromQueue } from "@/lib/offline-queue";
import { findProductByScannedValue } from "@stockops/core/barcode";
import type { Product, StockRow, Warehouse } from "@stockops/core/types";

import { MobileScanInput } from "./scan-input";

type Props = {
  products: Product[];
  warehouses: Warehouse[];
  stockRows: StockRow[];
};

type QueuedStocktake = {
  productId: string;
  warehouseId: string;
  countedQuantity: number;
  note?: string;
};

type Toast =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

const idleState = { actionId: 0, message: "", status: "idle" as const };

export function StocktakeForm({ products, warehouses, stockRows }: Props) {
  const router = useRouter();
  const defaultWarehouse = warehouses.find((warehouse) => warehouse.isDefault) ?? warehouses[0];
  const [warehouseId, setWarehouseId] = useState(defaultWarehouse?.id ?? "");
  const [productId, setProductId] = useState("");
  const [countedQuantity, setCountedQuantity] = useState("");
  const [note, setNote] = useState("");
  const [queueCount, setQueueCount] = useState(0);
  const [toast, setToast] = useState<Toast>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProduct = products.find((product) => product.id === productId);
  const selectedRow = useMemo(
    () =>
      stockRows.find(
        (row) => row.product.id === productId && row.warehouse.id === warehouseId,
      ),
    [productId, stockRows, warehouseId],
  );

  const refreshQueueCount = async () => {
    const items = await listQueue();
    setQueueCount(items.filter((item) => item.kind === "stocktake-count").length);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshQueueCount();
  }, []);

  const submitPayload = async (payload: QueuedStocktake) => {
    const formData = new FormData();
    formData.set("productId", payload.productId);
    formData.set("warehouseId", payload.warehouseId);
    formData.set("countedQuantity", String(payload.countedQuantity));
    formData.set("note", payload.note ?? "");
    const result = await recordStocktakeAction(idleState, formData);
    setToast({
      kind: result.status === "success" ? "success" : "error",
      message: result.message,
    });
    if (result.status === "success") {
      setCountedQuantity("");
      router.refresh();
    }
    return result.status === "success";
  };

  const syncQueue = async () => {
    if (!navigator.onLine) return;
    const items = await listQueue();
    const stocktakeItems = items.filter((item) => item.kind === "stocktake-count");

    for (const item of stocktakeItems) {
      const ok = await submitPayload(item.payload as QueuedStocktake);
      if (ok) {
        await removeFromQueue(item.id);
      } else {
        break;
      }
    }

    await refreshQueueCount();
  };

  useEffect(() => {
    const sync = () => {
      void syncQueue();
    };
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScan = (value: string) => {
    const product = findProductByScannedValue(products, value);
    if (!product) {
      setToast({ kind: "error", message: "Eslesen urun bulunamadi." });
      return;
    }
    setProductId(product.id);
    setToast({ kind: "success", message: `${product.sku} secildi.` });
  };

  const submit = () => {
    const quantity = Number(countedQuantity);
    if (!productId || !warehouseId || !Number.isInteger(quantity) || quantity < 0) {
      setToast({ kind: "error", message: "Urun, depo ve sayim miktarini kontrol edin." });
      return;
    }

    const payload: QueuedStocktake = {
      productId,
      warehouseId,
      countedQuantity: quantity,
      note,
    };

    startTransition(() => {
      void (async () => {
        if (!navigator.onLine) {
          await enqueue("stocktake-count", payload);
          await refreshQueueCount();
          setToast({ kind: "success", message: "Cevrimdisi kayit kuyruga alindi." });
          setCountedQuantity("");
          return;
        }
        await submitPayload(payload);
      })();
    });
  };

  return (
    <div className="grid gap-4">
      <MobileScanInput
        hint="Urunu tara, fiziksel miktari gir ve sayimi kaydet."
        onScan={onScan}
        placeholder="SKU veya barkod"
      />

      {toast && (
        <div
          aria-live="polite"
          className={`rounded-xl border px-3 py-2 text-sm ${
            toast.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <section className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-wider text-slate-500">Depo</span>
          <select
            className="rounded-xl border border-white/15 bg-slate-950 px-3 py-3 text-slate-100"
            onChange={(event) => setWarehouseId(event.target.value)}
            value={warehouseId}
          >
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-wider text-slate-500">Urun</span>
          <select
            className="rounded-xl border border-white/15 bg-slate-950 px-3 py-3 text-slate-100"
            onChange={(event) => setProductId(event.target.value)}
            value={productId}
          >
            <option value="">Urun sec</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.sku} - {product.name}
              </option>
            ))}
          </select>
        </label>

        {selectedProduct ? (
          <div className="rounded-xl bg-slate-950/70 px-3 py-3 text-sm">
            <div className="font-mono text-xs text-slate-400">{selectedProduct.sku}</div>
            <div className="font-medium">{selectedProduct.name}</div>
            <div className="mt-1 text-xs text-slate-400">
              Sistemde: {selectedRow?.onHand ?? 0}
            </div>
          </div>
        ) : null}

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Fiziksel miktar
          </span>
          <input
            className="rounded-xl border border-white/15 bg-slate-950 px-3 py-3 text-slate-100"
            inputMode="numeric"
            min={0}
            onChange={(event) => setCountedQuantity(event.target.value)}
            placeholder="0"
            type="number"
            value={countedQuantity}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-wider text-slate-500">Not</span>
          <input
            className="rounded-xl border border-white/15 bg-slate-950 px-3 py-3 text-slate-100"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Opsiyonel"
            value={note}
          />
        </label>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
          disabled={isPending}
          onClick={submit}
          type="button"
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="size-5" />
          )}
          Kaydet
        </button>
      </section>

      <button
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-slate-200 disabled:opacity-50"
        disabled={isPending || queueCount === 0}
        onClick={() => startTransition(() => void syncQueue())}
        type="button"
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        Kuyrugu senkronize et ({queueCount})
      </button>
    </div>
  );
}
