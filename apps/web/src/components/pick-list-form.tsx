"use client";

import { useRef, useState } from "react";
import { Check, Camera, Box } from "lucide-react";
import { useBarcodeScanner } from "@/components/barcode-scanner";
import { ActionForm, submitClass } from "@/components/action-form";
import { updatePickListItemAction } from "@/lib/actions";
import { inputClass } from "@/components/ui";

type PickListItemType = {
  id: string;
  pickListId: string;
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

export function PickListForm({
  pickListId,
  items,
}: {
  pickListId: string;
  items: PickListItemType[];
}) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const qtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { isScanning, message, startCamera, stopCamera, videoRef } =
    useBarcodeScanner({
      onDetected: (value) => {
        // Find item by barcode or sku
        const matchedItem = items.find(
          (item) => item.product.barcode === value || item.product.sku === value
        );

        if (matchedItem) {
          setActiveItemId(matchedItem.id);
          const input = qtyInputRefs.current[matchedItem.id];
          if (input) {
            input.focus();
            input.select();
          }
        }
      },
    });

  const totalItems = items.length;
  const completelyPickedItems = items.filter(
    (item) => item.pickedQty >= item.quantity
  ).length;
  const progressPercent =
    totalItems === 0 ? 0 : Math.round((completelyPickedItems / totalItems) * 100);

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-[var(--text-body)]">
          <span>Toplama İlerlemesi</span>
          <span>
            {completelyPickedItems} / {totalItems} Kalem ({progressPercent}%)
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
          <div
            className="h-full bg-[var(--accent-primary)] transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Barcode Scanner */}
      <div className="rounded-lg border border-[var(--border-input)] bg-[var(--bg-empty)] p-4">
        {isScanning ? (
          <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black md:aspect-[21/9]">
              <video
                ref={videoRef}
                className="absolute inset-0 size-full object-cover"
                playsInline
                muted
              />
              <div className="absolute inset-0 border-[40px] border-black/40">
                <div className="size-full border-2 border-dashed border-[var(--accent-warning-text)]" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => stopCamera(true)}
              className="w-full rounded-md border border-[var(--border-input)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-body)] hover:bg-[var(--bg-hover)]"
            >
              Kamerayı Kapat
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startCamera}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--bg-card)] px-4 py-3 text-sm font-semibold text-[var(--accent-primary)] shadow-sm ring-1 ring-inset ring-[var(--border-input)] hover:bg-[var(--bg-empty)]"
          >
            <Camera className="size-5" />
            Barkod Okutarak Bul
          </button>
        )}
        {message ? (
          <p className="mt-2 text-center text-sm text-[var(--accent-danger-text)]">{message}</p>
        ) : null}
      </div>

      {/* Item List */}
      <div className="space-y-3">
        {items.map((item) => {
          const isComplete = item.pickedQty >= item.quantity;

          return (
            <div
              key={item.id}
              className={`rounded-lg border p-4 transition-colors ${
                isComplete
                  ? "border-[var(--accent-success-text)] bg-[var(--accent-success-bg)]"
                  : activeItemId === item.id
                    ? "border-[var(--accent-primary)] bg-[var(--bg-card)] ring-1 ring-[var(--accent-primary)]"
                    : "border-[var(--border-dashed)] bg-[var(--bg-card)]"
              }`}
            >
              <ActionForm
                action={updatePickListItemAction}
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                resetOnSuccess={false}
              >
                {(pending) => (
                  <>
                    <input type="hidden" name="pickListId" value={pickListId} />
                    <input type="hidden" name="itemId" value={item.id} />

                    <div className="flex flex-1 items-start gap-3">
                      <div
                        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${
                          isComplete ? "bg-[var(--accent-primary)] text-white" : "bg-[var(--border-subtle)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {isComplete ? <Check className="size-5" /> : <Box className="size-4" />}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {item.product.sku} — {item.product.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          {item.binLocation ? (
                            <span className="rounded-md bg-[var(--border-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--text-body)]">
                              Raf: {item.binLocation}
                            </span>
                          ) : null}
                          {item.product.barcode ? (
                            <span className="text-xs">Barkod: {item.product.barcode}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <span className="block text-[var(--text-secondary)]">Hedef</span>
                        <span className="font-semibold text-[var(--text-primary)]">{item.quantity}</span>
                      </div>
                      <div className="text-right">
                        <label htmlFor={`qty-${item.id}`} className="sr-only">
                          Toplanan Miktar
                        </label>
                        <input
                          id={`qty-${item.id}`}
                          ref={(el) => {
                            qtyInputRefs.current[item.id] = el;
                          }}
                          name="pickedQty"
                          type="number"
                          min="0"
                          max={item.quantity}
                          defaultValue={item.pickedQty}
                          onFocus={() => setActiveItemId(item.id)}
                          className={`${inputClass} w-20 text-center font-medium ${
                            isComplete ? "border-[var(--accent-success-text)] bg-transparent text-[var(--accent-primary)]" : ""
                          }`}
                        />
                      </div>
                      <button
                        type="submit"
                        className={submitClass(pending, "subtle")}
                      >
                        Kaydet
                      </button>
                    </div>
                  </>
                )}
              </ActionForm>
            </div>
          );
        })}
      </div>
    </div>
  );
}
