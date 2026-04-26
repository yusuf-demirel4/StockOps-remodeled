"use client";

import { Plus } from "lucide-react";
import { ActionForm, submitClass } from "@/components/action-form";
import { BarcodeProductPicker } from "@/components/barcode-product-picker";
import { inputClass, selectClass } from "@/components/ui";
import {
  createStockMovementAction,
  createStockTransferAction,
} from "@/lib/actions";
import type { Product, Warehouse } from "@stockops/core/types";

export function StockMovementForm({
  products,
  warehouses,
}: {
  products: Product[];
  warehouses: Warehouse[];
}) {
  const isDisabled = products.length === 0 || warehouses.length === 0;

  return (
    <ActionForm action={createStockMovementAction}>
      {(pending) => (
        <>
          <label className="grid gap-1.5 text-sm font-medium">
            Barkod / hızlı giriş
            <input
              className={inputClass}
              name="barcode"
              placeholder="USB okuyucu ile okut"
            />
          </label>
          <BarcodeProductPicker products={products} />
          <label className="grid gap-1.5 text-sm font-medium">
            Depo
            <select className={selectClass} name="warehouseId" required>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Hareket tipi
            <select className={selectClass} name="type" required>
              <option value="INBOUND">Giriş</option>
              <option value="OUTBOUND">Çıkış</option>
              <option value="ADJUSTMENT">Düzeltme</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Miktar
            <input
              className={inputClass}
              min="1"
              name="quantity"
              required
              type="number"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Not
            <input className={inputClass} name="note" />
          </label>
          <button
            className={submitClass(pending)}
            disabled={pending || isDisabled}
            type="submit"
          >
            <Plus aria-hidden="true" className="size-4" />
            {pending ? "Kaydediliyor" : "Hareket kaydet"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function StockTransferForm({
  products,
  warehouses,
}: {
  products: Product[];
  warehouses: Warehouse[];
}) {
  const isDisabled = products.length === 0 || warehouses.length < 2;

  return (
    <ActionForm action={createStockTransferAction}>
      {(pending) => (
        <>
          <BarcodeProductPicker products={products} />
          <label className="grid gap-1.5 text-sm font-medium">
            Kaynak depo
            <select className={selectClass} name="sourceWarehouseId" required>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Hedef depo
            <select
              className={selectClass}
              defaultValue={warehouses[1]?.id}
              name="destinationWarehouseId"
              required
            >
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Miktar
            <input
              className={inputClass}
              min="1"
              name="quantity"
              required
              type="number"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Not
            <input className={inputClass} name="note" />
          </label>
          <button
            className={submitClass(pending)}
            disabled={pending || isDisabled}
            type="submit"
          >
            <Plus aria-hidden="true" className="size-4" />
            {pending ? "Aktarılıyor" : "Transfer oluştur"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
