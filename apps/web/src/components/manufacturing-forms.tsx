"use client";

import { useState } from "react";
import {
  createBomAction,
  createManufacturingOrderAction,
  startManufacturingOrderAction,
  completeManufacturingOrderAction,
} from "@/lib/actions";
import { ActionForm, submitClass } from "@/components/action-form";
import { inputClass, selectClass, subtleButtonClass } from "@/components/ui";
import type { Product, BillOfMaterial, Warehouse } from "@stockops/core/types";

export function BomCreateForm({ products }: { products: Product[] }) {
  const [components, setComponents] = useState([{ productId: "", quantity: "1" }]);

  const activeProducts = products.filter((p) => p.isActive);

  return (
    <ActionForm action={createBomAction}>
      {(pending) => (
        <>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Mamul ürün</span>
            <select name="productId" className={selectClass} required>
              <option value="">Seçin...</option>
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Reçete adı</span>
            <input name="name" className={inputClass} placeholder="Varsayılan reçete" required />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Açıklama</span>
            <input name="description" className={inputClass} placeholder="Opsiyonel" />
          </label>

          <fieldset className="grid gap-2">
            <legend className="text-xs font-medium text-[var(--text-secondary)]">Bileşenler (hammaddeler)</legend>
            {components.map((comp, i) => (
              <div key={i} className="flex items-end gap-2">
                <select
                  name="componentProductId"
                  className={selectClass}
                  value={comp.productId}
                  onChange={(e) => {
                    const next = [...components];
                    next[i] = { ...next[i], productId: e.target.value };
                    setComponents(next);
                  }}
                  required
                >
                  <option value="">Ürün seçin...</option>
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
                <input
                  name="componentQuantity"
                  type="number"
                  min="0.0001"
                  step="any"
                  className={`${inputClass} w-24`}
                  placeholder="Adet"
                  value={comp.quantity}
                  onChange={(e) => {
                    const next = [...components];
                    next[i] = { ...next[i], quantity: e.target.value };
                    setComponents(next);
                  }}
                  required
                />
                {components.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-[var(--accent-danger-text)] hover:underline"
                    onClick={() => setComponents(components.filter((_, j) => j !== i))}
                  >
                    Sil
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className={`${subtleButtonClass} h-8 text-xs`}
              onClick={() => setComponents([...components, { productId: "", quantity: "1" }])}
            >
              + Bileşen ekle
            </button>
          </fieldset>

          <button type="submit" disabled={pending} className={submitClass(pending)}>
            {pending ? "Kaydediliyor..." : "Reçete oluştur"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function ManufacturingOrderCreateForm({
  boms,
  warehouses,
  products,
}: {
  boms: BillOfMaterial[];
  warehouses: Warehouse[];
  products: Product[];
}) {
  return (
    <ActionForm action={createManufacturingOrderAction}>
      {(pending) => (
        <>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Ürün reçetesi</span>
            <select name="bomId" className={selectClass} required>
              <option value="">Seçin...</option>
              {boms
                .filter((b) => b.isActive)
                .map((b) => {
                  const product = products.find((p) => p.id === b.productId);
                  return (
                    <option key={b.id} value={b.id}>
                      {product?.sku ?? "?"} — {b.name}
                    </option>
                  );
                })}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Depo</span>
            <select name="warehouseId" className={selectClass} required>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.isDefault ? "(Varsayılan)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Üretim miktarı</span>
            <input name="quantity" type="number" min="1" className={inputClass} defaultValue="1" required />
          </label>

          <button type="submit" disabled={pending} className={submitClass(pending)}>
            {pending ? "Oluşturuluyor..." : "Üretim emri oluştur"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function StartManufacturingButton({ moId }: { moId: string }) {
  return (
    <ActionForm action={startManufacturingOrderAction} className="inline" resetOnSuccess={false}>
      {(pending) => (
        <>
          <input type="hidden" name="moId" value={moId} />
          <button type="submit" disabled={pending} className={`${subtleButtonClass} h-7 px-2 text-xs`}>
            {pending ? "..." : "Başlat"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function CompleteManufacturingButton({ moId }: { moId: string }) {
  return (
    <ActionForm action={completeManufacturingOrderAction} className="inline" resetOnSuccess={false}>
      {(pending) => (
        <>
          <input type="hidden" name="moId" value={moId} />
          <button type="submit" disabled={pending} className={`${subtleButtonClass} h-7 px-2 text-xs`}>
            {pending ? "..." : "Tamamla"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
