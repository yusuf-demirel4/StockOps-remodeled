"use client";

import { CheckCircle2, Loader2, PackageCheck, Play } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  markPackedAction,
  startPickingAction,
  updatePickListItemAction,
} from "@/lib/actions";
import type { SalesOrder } from "@stockops/core/types";

import { MobileScanInput } from "./scan-input";

type PickItem = {
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
};

type PickingJob = {
  orderId: string;
  orderCode: string;
  customerName: string;
  pickListId: string;
  status: string;
  items: PickItem[];
};

type Props = {
  confirmedOrders: SalesOrder[];
  pickingJobs: PickingJob[];
};

type Toast =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

const idleState = { actionId: 0, message: "", status: "idle" as const };

export function MobilePickList({ confirmedOrders, pickingJobs }: Props) {
  const router = useRouter();
  const [activeJobId, setActiveJobId] = useState(pickingJobs[0]?.pickListId ?? "");
  const [activeItemId, setActiveItemId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<Toast>(null);
  const [isPending, startTransition] = useTransition();

  const activeJob = useMemo(
    () => pickingJobs.find((job) => job.pickListId === activeJobId) ?? pickingJobs[0],
    [activeJobId, pickingJobs],
  );

  const onScan = (value: string) => {
    if (!activeJob) {
      setToast({ kind: "error", message: "Aktif toplama listesi yok." });
      return;
    }

    const item = activeJob.items.find(
      (candidate) =>
        candidate.product.sku === value ||
        candidate.product.barcode === value ||
        candidate.product.id === value,
    );

    if (!item) {
      setToast({ kind: "error", message: "Bu listede eslesen urun yok." });
      return;
    }

    setActiveItemId(item.id);
    setDrafts((current) => ({
      ...current,
      [item.id]: Math.min(item.quantity, (current[item.id] ?? item.pickedQty) + 1),
    }));
    setToast({ kind: "success", message: `${item.product.sku} isaretlendi.` });
  };

  const runAction = async (
    action: (state: typeof idleState, data: FormData) => Promise<typeof idleState>,
    formData: FormData,
  ) => {
    const result = await action(idleState, formData);
    setToast({
      kind: result.status === "success" ? "success" : "error",
      message: result.message,
    });
    if (result.status === "success") {
      router.refresh();
    }
  };

  const startOrder = (orderId: string) => {
    const formData = new FormData();
    formData.set("orderId", orderId);
    startTransition(() => void runAction(startPickingAction, formData));
  };

  const saveItem = (item: PickItem) => {
    const formData = new FormData();
    formData.set("pickListId", item.pickListId);
    formData.set("itemId", item.id);
    formData.set("pickedQty", String(drafts[item.id] ?? item.pickedQty));
    startTransition(() => void runAction(updatePickListItemAction, formData));
  };

  const packOrder = (orderId: string) => {
    const formData = new FormData();
    formData.set("orderId", orderId);
    startTransition(() => void runAction(markPackedAction, formData));
  };

  return (
    <div className="grid gap-4">
      <MobileScanInput
        hint="Toplama listesindeki urun barkodunu tara; her tarama miktari 1 artirir."
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

      {confirmedOrders.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-sm font-medium text-slate-300">Baslatilacak siparisler</h2>
          {confirmedOrders.map((order) => (
            <button
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-left active:bg-slate-900 disabled:opacity-60"
              disabled={isPending}
              key={order.id}
              onClick={() => startOrder(order.id)}
              type="button"
            >
              <span>
                <span className="block font-mono text-sm">{order.code}</span>
                <span className="text-xs text-slate-400">{order.customerName}</span>
              </span>
              <Play aria-hidden="true" className="size-5 text-indigo-300" />
            </button>
          ))}
        </section>
      )}

      {pickingJobs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {pickingJobs.map((job) => (
            <button
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
                job.pickListId === activeJob?.pickListId
                  ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                  : "border-white/10 text-slate-400"
              }`}
              key={job.pickListId}
              onClick={() => setActiveJobId(job.pickListId)}
              type="button"
            >
              {job.orderCode}
            </button>
          ))}
        </div>
      )}

      {activeJob ? (
        <section className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Aktif toplama
              </p>
              <h2 className="font-mono text-lg">{activeJob.orderCode}</h2>
              <p className="text-xs text-slate-400">{activeJob.customerName}</p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              disabled={isPending}
              onClick={() => packOrder(activeJob.orderId)}
              type="button"
            >
              <PackageCheck aria-hidden="true" className="size-4" />
              Paketle
            </button>
          </div>

          <ul className="grid gap-2">
            {activeJob.items.map((item) => {
              const pickedQty = drafts[item.id] ?? item.pickedQty;
              const complete = pickedQty >= item.quantity;

              return (
                <li
                  className={`rounded-xl border px-3 py-3 ${
                    activeItemId === item.id
                      ? "border-indigo-400 bg-indigo-500/10"
                      : "border-white/10 bg-slate-950/60"
                  }`}
                  key={item.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-slate-400">
                        {item.product.sku}
                      </p>
                      <p className="text-sm font-medium text-slate-100">
                        {item.product.name}
                      </p>
                      {item.binLocation ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Raf: {item.binLocation}
                        </p>
                      ) : null}
                    </div>
                    {complete ? (
                      <CheckCircle2 aria-hidden="true" className="size-5 text-emerald-300" />
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      className="w-20 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-center text-sm text-slate-100"
                      max={item.quantity}
                      min={0}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: Number(event.target.value),
                        }))
                      }
                      type="number"
                      value={pickedQty}
                    />
                    <span className="text-xs text-slate-400">/ {item.quantity}</span>
                    <button
                      className="ml-auto inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      disabled={isPending}
                      onClick={() => saveItem(item)}
                      type="button"
                    >
                      {isPending ? (
                        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      ) : null}
                      Kaydet
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
          Toplanacak aktif liste yok.
        </div>
      )}
    </div>
  );
}
