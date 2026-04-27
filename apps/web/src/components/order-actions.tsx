"use client";

import { ActionForm, submitClass } from "@/components/action-form";
import { startPickingAction, markPackedAction, deliverOrderAction } from "@/lib/actions";

export function StartPickingForm({ orderId }: { orderId: string }) {
  return (
    <ActionForm action={startPickingAction} resetOnSuccess={false}>
      {(pending) => (
        <>
          <input type="hidden" name="orderId" value={orderId} />
          <button type="submit" className={submitClass(pending, "primary")}>
            Toplama İşlemini Başlat
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function MarkPackedForm({ orderId }: { orderId: string }) {
  return (
    <ActionForm action={markPackedAction} resetOnSuccess={false}>
      {(pending) => (
        <>
          <input type="hidden" name="orderId" value={orderId} />
          <button type="submit" className={submitClass(pending, "primary")}>
            Paketlendi Olarak İşaretle
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function DeliverOrderForm({ orderId }: { orderId: string }) {
  return (
    <ActionForm action={deliverOrderAction} resetOnSuccess={false}>
      {(pending) => (
        <>
          <input type="hidden" name="orderId" value={orderId} />
          <button type="submit" className={submitClass(pending, "primary")}>
            Teslim Edildi Olarak İşaretle
          </button>
        </>
      )}
    </ActionForm>
  );
}
