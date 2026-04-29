"use client";

import { useState, useActionState } from "react";
import { placeOrderAction, type OrderActionState } from "@/lib/actions";
import { Panel, buttonClass, inputClass } from "@/components/ui";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

type Product = {
  id: string;
  sku: string;
  name: string;
  tierPrice: number;
  stock: number;
};

const fmt = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

const initialState: OrderActionState = { status: "idle", message: "" };

export function OrderForm({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [notes, setNotes] = useState("");
  const [state, formAction, pending] = useActionState(placeOrderAction, initialState);

  function updateQty(productId: string, delta: number) {
    setCart((prev) => {
      const next = new Map(prev);
      const current = next.get(productId) ?? 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) next.delete(productId);
      else next.set(productId, newQty);
      return next;
    });
  }

  function setQty(productId: string, qty: number) {
    setCart((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(productId);
      else next.set(productId, qty);
      return next;
    });
  }

  const cartItems = Array.from(cart.entries()).map(([id, qty]) => {
    const product = products.find((p) => p.id === id)!;
    return { ...product, qty };
  });
  const total = cartItems.reduce((s, i) => s + i.qty * i.tierPrice, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Product list */}
      <Panel title="Ürün seçin">
        <div className="grid gap-2">
          {products.map((product) => {
            const qty = cart.get(product.id) ?? 0;
            return (
              <div
                key={product.id}
                className="flex items-center justify-between gap-4 rounded-md border border-[var(--border-subtle)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {product.sku} · {fmt.format(product.tierPrice)} · Stok: {product.stock}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateQty(product.id, -1)}
                    disabled={qty === 0}
                    className="inline-flex size-7 items-center justify-center rounded border border-[var(--border-input)] text-xs transition hover:bg-[var(--bg-hover)] disabled:opacity-30"
                  >
                    <Minus className="size-3" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={product.stock}
                    value={qty}
                    onChange={(e) => setQty(product.id, Number(e.target.value))}
                    className="h-7 w-14 rounded border border-[var(--border-input)] bg-[var(--bg-input)] text-center text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => updateQty(product.id, 1)}
                    disabled={qty >= product.stock}
                    className="inline-flex size-7 items-center justify-center rounded border border-[var(--border-input)] text-xs transition hover:bg-[var(--bg-hover)] disabled:opacity-30"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Cart summary */}
      <div className="self-start">
        <Panel title="Sipariş özeti">
          {cartItems.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Sol taraftan ürün ekleyin.
            </p>
          ) : (
            <form action={formAction}>
              <div className="grid gap-2">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="ml-1 text-[var(--text-secondary)]">
                        x{item.qty}
                      </span>
                      <input type="hidden" name="productId" value={item.id} />
                      <input type="hidden" name="quantity" value={item.qty} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {fmt.format(item.qty * item.tierPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(item.id, 0)}
                        className="text-[var(--accent-danger-text)] hover:opacity-70"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Toplam</span>
                  <span className="text-lg">{fmt.format(total)}</span>
                </div>
              </div>

              <label className="mt-3 grid gap-1">
                <span className="text-xs text-[var(--text-secondary)]">Not (opsiyonel)</span>
                <textarea
                  name="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                  placeholder="Teslimat notu..."
                />
              </label>

              <button
                type="submit"
                disabled={pending || cartItems.length === 0}
                className={`${buttonClass} mt-3 w-full ${pending ? "cursor-wait opacity-70" : ""}`}
              >
                <ShoppingCart className="size-4" />
                {pending ? "Gönderiliyor..." : "Sipariş ver"}
              </button>

              {state.status !== "idle" && (
                <p
                  className={`mt-2 rounded-md px-3 py-2 text-sm ${
                    state.status === "success"
                      ? "bg-[var(--accent-success-bg)] text-[var(--accent-success-text)]"
                      : "bg-[var(--accent-danger-bg)] text-[var(--accent-danger-text)]"
                  }`}
                >
                  {state.message}
                </p>
              )}
            </form>
          )}
        </Panel>
      </div>
    </div>
  );
}
