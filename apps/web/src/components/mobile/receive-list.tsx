"use client";

import { CheckCircle2, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { receivePurchaseOrderAction } from "@/lib/actions";
import { enqueue, listQueue, removeFromQueue } from "@/lib/offline-queue";
import { findProductByScannedValue } from "@stockops/core/barcode";
import type { Product, PurchaseOrder, Supplier } from "@stockops/core/types";

import { MobileScanInput } from "./scan-input";

type Props = {
  orders: PurchaseOrder[];
  products: Product[];
  suppliers: Supplier[];
};

type ToastState =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

type QueuedReceive = {
  orderId: string;
};

const idleState = { actionId: 0, message: "", status: "idle" as const };

export function ReceiveList({ orders, products, suppliers }: Props) {
  const router = useRouter();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((product) => map.set(product.id, product));
    return map;
  }, [products]);

  const supplierMap = useMemo(() => {
    const map = new Map<string, Supplier>();
    suppliers.forEach((supplier) => map.set(supplier.id, supplier));
    return map;
  }, [suppliers]);

  const activeOrder = orders.find((order) => order.id === activeOrderId);

  const refreshQueueCount = async () => {
    const items = await listQueue();
    setQueueCount(items.filter((item) => item.kind === "receive-purchase-order").length);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshQueueCount();
  }, []);

  const submitPayload = async (payload: QueuedReceive) => {
    const formData = new FormData();
    formData.set("orderId", payload.orderId);
    const result = await receivePurchaseOrderAction(idleState, formData);
    setToast({
      kind: result.status === "success" ? "success" : "error",
      message: result.message,
    });
    if (result.status === "success") {
      setActiveOrderId(null);
      router.refresh();
    }
    return result.status === "success";
  };

  const syncQueue = async () => {
    if (!navigator.onLine) return;
    const items = await listQueue();
    const receiveItems = items.filter(
      (item) => item.kind === "receive-purchase-order",
    );

    for (const item of receiveItems) {
      const ok = await submitPayload(item.payload as QueuedReceive);
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
      setToast({ kind: "error", message: "Eşleşen ürün bulunamadı." });
      return;
    }
    const matched = orders.find((order) =>
      order.lines.some((line) => line.productId === product.id),
    );
    if (!matched) {
      setToast({
        kind: "error",
        message: `${product.sku} için açık satınalma siparişi yok.`,
      });
      return;
    }
    setActiveOrderId(matched.id);
    setToast({
      kind: "success",
      message: `${matched.code} açıldı (${product.sku}).`,
    });
  };

  const submitReceive = (orderId: string) => {
    startTransition(async () => {
      const payload = { orderId };

      if (!navigator.onLine) {
        await enqueue("receive-purchase-order", payload);
        await refreshQueueCount();
        setToast({ kind: "success", message: "Cevrimdisi teslim kuyruga alindi." });
        setActiveOrderId(null);
        return;
      }

      await submitPayload(payload);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <MobileScanInput
        hint="Bir ürün barkodu tarayarak ilgili açık siparişi açın."
        onScan={onScan}
        placeholder="Ürün barkodu veya SKU"
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

      {activeOrder ? (
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400">
                Açık satınalma
              </div>
              <div className="font-mono text-lg text-slate-100">{activeOrder.code}</div>
              <div className="text-xs text-slate-400">
                {supplierMap.get(activeOrder.supplierId)?.name ?? "—"}
              </div>
            </div>
            <button
              className="text-xs text-slate-400 underline"
              onClick={() => setActiveOrderId(null)}
              type="button"
            >
              Kapat
            </button>
          </div>

          <ul className="grid gap-1.5 text-sm">
            {activeOrder.lines.map((line) => {
              const product = productMap.get(line.productId);
              const remaining = line.quantity - line.receivedQuantity;
              return (
                <li
                  key={line.productId}
                  className="flex items-center justify-between rounded-md bg-slate-950/60 px-3 py-2"
                >
                  <div>
                    <div className="font-mono text-xs text-slate-300">
                      {product?.sku ?? "?"}
                    </div>
                    <div className="text-slate-100">{product?.name ?? "?"}</div>
                  </div>
                  <div className="text-right text-xs text-slate-300">
                    <div>{line.receivedQuantity}/{line.quantity}</div>
                    {remaining > 0 ? (
                      <div className="text-amber-300">{remaining} bekliyor</div>
                    ) : (
                      <div className="text-emerald-300">Tamam</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-base font-semibold text-white active:bg-emerald-400 disabled:opacity-50"
            disabled={isPending}
            onClick={() => submitReceive(activeOrder.id)}
            type="button"
          >
            {isPending ? (
              <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="size-5" />
            )}
            Tüm satırları teslim al
          </button>
        </div>
      ) : (
        <div className="grid gap-2">
          <h2 className="text-sm font-medium text-slate-300">Açık siparişler</h2>
          {orders.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
              Açık satınalma siparişi yok.
            </div>
          ) : (
            <ul className="grid gap-2">
              {orders.map((order) => {
                const totalLines = order.lines.length;
                const totalQty = order.lines.reduce(
                  (sum, line) => sum + line.quantity,
                  0,
                );
                const receivedQty = order.lines.reduce(
                  (sum, line) => sum + line.receivedQuantity,
                  0,
                );
                return (
                  <li key={order.id}>
                    <button
                      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-left active:bg-slate-900"
                      onClick={() => setActiveOrderId(order.id)}
                      type="button"
                    >
                      <div>
                        <div className="font-mono text-sm">{order.code}</div>
                        <div className="text-xs text-slate-400">
                          {supplierMap.get(order.supplierId)?.name ?? "—"} ·{" "}
                          {totalLines} satır · {receivedQty}/{totalQty}
                        </div>
                      </div>
                      <ChevronRight aria-hidden="true" className="size-5 text-slate-500" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

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
