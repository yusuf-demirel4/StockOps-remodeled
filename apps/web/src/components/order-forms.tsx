"use client";

import { Check, Plus, Truck } from "lucide-react";
import { ActionForm, submitClass } from "@/components/action-form";
import { inputClass, selectClass } from "@/components/ui";
import {
  confirmSalesOrderAction,
  createPurchaseOrderAction,
  createSalesOrderAction,
  receivePurchaseOrderAction,
} from "@/lib/actions";
import type { Product, Supplier } from "@stockops/core/types";

export function SalesOrderForm({ products }: { products: Product[] }) {
  return (
    <ActionForm action={createSalesOrderAction}>
      {(pending) => (
        <>
          <label className="grid gap-1.5 text-sm font-medium">
            Müşteri
            <input className={inputClass} name="customerName" required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Ürün
            <select className={selectClass} name="productId" required>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} - {product.name}
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
          <button
            className={submitClass(pending)}
            disabled={pending || products.length === 0}
            type="submit"
          >
            <Plus aria-hidden="true" className="size-4" />
            {pending ? "Oluşturuluyor" : "Satış oluştur"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function PurchaseOrderForm({
  products,
  suppliers,
}: {
  products: Product[];
  suppliers: Supplier[];
}) {
  const isDisabled = products.length === 0 || suppliers.length === 0;

  return (
    <ActionForm action={createPurchaseOrderAction}>
      {(pending) => (
        <>
          <label className="grid gap-1.5 text-sm font-medium">
            Tedarikçi
            <select className={selectClass} name="supplierId" required>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Ürün
            <select className={selectClass} name="productId" required>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} - {product.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
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
              Beklenen tarih
              <input className={inputClass} name="expectedDate" type="date" />
            </label>
          </div>
          <button
            className={submitClass(pending)}
            disabled={pending || isDisabled}
            type="submit"
          >
            <Truck aria-hidden="true" className="size-4" />
            {pending ? "Oluşturuluyor" : "Satın alma oluştur"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function ConfirmSalesOrderForm({ orderId }: { orderId: string }) {
  return (
    <ActionForm
      action={confirmSalesOrderAction}
      className="grid gap-2"
      resetOnSuccess={false}
    >
      {(pending) => (
        <>
          <input name="orderId" type="hidden" value={orderId} />
          <button
            className={submitClass(pending, "subtle")}
            disabled={pending}
            type="submit"
          >
            <Check aria-hidden="true" className="size-4" />
            {pending ? "Onaylanıyor" : "Onayla"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function ReceivePurchaseOrderForm({ orderId }: { orderId: string }) {
  return (
    <ActionForm
      action={receivePurchaseOrderAction}
      className="grid gap-2"
      resetOnSuccess={false}
    >
      {(pending) => (
        <>
          <input name="orderId" type="hidden" value={orderId} />
          <button
            className={submitClass(pending, "subtle")}
            disabled={pending}
            type="submit"
          >
            <Check aria-hidden="true" className="size-4" />
            {pending ? "Alınıyor" : "Teslim al"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
