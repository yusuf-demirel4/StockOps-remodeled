"use client";

import { ActionForm, submitClass } from "@/components/action-form";
import { transitionInvoiceStatusAction } from "@/lib/actions";

export function InvoiceStatusForm({
  invoiceId,
  currentStatus,
}: {
  invoiceId: string;
  currentStatus: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus === "DRAFT" && (
        <ActionForm action={transitionInvoiceStatusAction}>
          {(pending) => (
            <>
              <input type="hidden" name="invoiceId" value={invoiceId} />
              <input type="hidden" name="targetStatus" value="SENT" />
              <button
                className={submitClass(pending, "primary")}
                disabled={pending}
                type="submit"
              >
                Müşteriye Gönderildi İşaretle
              </button>
            </>
          )}
        </ActionForm>
      )}

      {(currentStatus === "DRAFT" || currentStatus === "SENT" || currentStatus === "OVERDUE") && (
        <ActionForm action={transitionInvoiceStatusAction}>
          {(pending) => (
            <>
              <input type="hidden" name="invoiceId" value={invoiceId} />
              <input type="hidden" name="targetStatus" value="CANCELLED" />
              <button
                className={submitClass(pending, "subtle")}
                disabled={pending}
                type="submit"
              >
                İptal Et
              </button>
            </>
          )}
        </ActionForm>
      )}
    </div>
  );
}
