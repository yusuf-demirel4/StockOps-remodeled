"use client";

import { ActionForm, submitClass } from "@/components/action-form";
import { shipOrderAction } from "@/lib/actions";
import { inputClass, selectClass } from "@/components/ui";

const carriers = ["Yurtiçi", "Aras", "MNG", "PTT", "Diğer"];

export function ShipmentForm({ orderId }: { orderId: string }) {
  return (
    <ActionForm action={shipOrderAction} className="grid gap-4">
      {(pending) => (
        <>
          <input type="hidden" name="orderId" value={orderId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="carrier" className="mb-1 block text-sm font-medium text-[var(--text-body)]">
                Kargo Firması
              </label>
              <select id="carrier" name="carrier" className={selectClass} required>
                <option value="">Seçiniz</option>
                {carriers.map((carrier) => (
                  <option key={carrier} value={carrier}>
                    {carrier}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="trackingNumber" className="mb-1 block text-sm font-medium text-[var(--text-body)]">
                Takip No
              </label>
              <input
                id="trackingNumber"
                name="trackingNumber"
                type="text"
                className={inputClass}
                placeholder="Örn: 123456789"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="weight" className="mb-1 block text-sm font-medium text-[var(--text-body)]">
                Ağırlık (kg)
              </label>
              <input
                id="weight"
                name="weight"
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                placeholder="Örn: 2.5"
              />
            </div>
            <div>
              <label htmlFor="packageCount" className="mb-1 block text-sm font-medium text-[var(--text-body)]">
                Paket Sayısı
              </label>
              <input
                id="packageCount"
                name="packageCount"
                type="number"
                min="1"
                defaultValue={1}
                className={inputClass}
                required
              />
            </div>
          </div>

          <button type="submit" className={submitClass(pending, "primary")}>
            Kargoya Ver
          </button>
        </>
      )}
    </ActionForm>
  );
}
