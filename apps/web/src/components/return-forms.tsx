"use client";

import { clsx } from "clsx";
import { Check, RotateCcw } from "lucide-react";
import { ActionForm, submitClass } from "@/components/action-form";
import { inputClass, subtleButtonClass } from "@/components/ui";
import {
  approveSalesReturnAction,
  createSalesReturnAction,
} from "@/lib/actions";
import type { Product, SalesOrder } from "@stockops/core/types";

export function CreateReturnDisclosure({
  order,
  products,
}: {
  order: SalesOrder;
  products: Product[];
}) {
  return (
    <details>
      <summary
        className={clsx(
          subtleButtonClass,
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        İade oluştur
      </summary>
      <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-empty)] p-3">
        <CreateReturnForm order={order} products={products} />
      </div>
    </details>
  );
}

function CreateReturnForm({
  order,
  products,
}: {
  order: SalesOrder;
  products: Product[];
}) {
  return (
    <ActionForm action={createSalesReturnAction}>
      {(pending) => (
        <>
          <input name="salesOrderId" type="hidden" value={order.id} />
          <p className="text-xs text-[var(--neutral-badge-text)]">
            Sipariş <span className="font-mono">{order.code}</span> için iade
            talebi.
          </p>
          <div className="grid gap-2">
            {order.lines.map((line, index) => {
              const product = products.find((p) => p.id === line.productId);
              return (
                <div
                  className="grid grid-cols-[1fr_120px] items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2"
                  key={`${line.productId}-${index}`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {product?.name ?? "Bilinmeyen ürün"}
                    </p>
                    <p className="font-mono text-xs text-[var(--text-secondary)]">
                      {product?.sku ?? line.productId} • Sipariş: {line.quantity}
                    </p>
                  </div>
                  <input name="productId" type="hidden" value={line.productId} />
                  <input
                    aria-label={`İade miktarı ${product?.sku ?? ""}`}
                    className={inputClass}
                    defaultValue={0}
                    max={line.quantity}
                    min={0}
                    name="quantity"
                    type="number"
                  />
                </div>
              );
            })}
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            Sebep (opsiyonel)
            <input className={inputClass} name="reason" />
          </label>
          <button
            className={submitClass(pending, "subtle")}
            disabled={pending}
            type="submit"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            {pending ? "Oluşturuluyor" : "İade talebi oluştur"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function ApproveReturnForm({ returnId }: { returnId: string }) {
  return (
    <ActionForm
      action={approveSalesReturnAction}
      className="grid gap-2"
      resetOnSuccess={false}
    >
      {(pending) => (
        <>
          <input name="returnId" type="hidden" value={returnId} />
          <button
            className={submitClass(pending, "subtle")}
            disabled={pending}
            type="submit"
          >
            <Check aria-hidden="true" className="size-4" />
            {pending ? "Onaylanıyor" : "Onayla & stoğa al"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
