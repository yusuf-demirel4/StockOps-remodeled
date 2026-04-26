"use client";

import { useCallback, useMemo, useState } from "react";
import { Camera, ScanLine, Square } from "lucide-react";
import { findProductByScannedValue } from "@stockops/core/barcode";
import type { Product } from "@stockops/core/types";
import { useBarcodeScanner } from "@/components/barcode-scanner";
import { buttonClass, inputClass, selectClass, subtleButtonClass } from "./ui";

export function BarcodeProductPicker({
  label = "Ürün",
  name = "productId",
  products,
}: {
  label?: string;
  name?: string;
  products: Product[];
}) {
  const [selectedProductId, setSelectedProductId] = useState(
    () => products[0]?.id ?? "",
  );
  const [scannedValue, setScannedValue] = useState("");
  const [message, setMessage] = useState("");
  const effectiveSelectedProductId = products.some(
    (product) => product.id === selectedProductId,
  )
    ? selectedProductId
    : products[0]?.id ?? "";
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === effectiveSelectedProductId),
    [products, effectiveSelectedProductId],
  );
  const resolveScannedValue = useCallback(
    (value: string) => {
      setScannedValue(value);

      if (!value.trim()) {
        setMessage("");
        return;
      }

      const product = findProductByScannedValue(products, value);

      if (!product) {
        setMessage("Eşleşen ürün bulunamadı.");
        return;
      }

      setSelectedProductId(product.id);
      setMessage(`${product.sku} seçildi.`);
    },
    [products],
  );
  const {
    isScanning,
    message: scannerMessage,
    startCamera,
    stopCamera,
    videoRef,
  } = useBarcodeScanner({ onDetected: resolveScannedValue });
  const visibleMessage = message || scannerMessage;

  return (
    <div className="grid gap-2">
      <input name={name} type="hidden" value={effectiveSelectedProductId} />
      <label className="grid gap-1.5 text-sm font-medium">
        {label}
        <select
          className={selectClass}
          onChange={(event) => {
            setSelectedProductId(event.target.value);
            setMessage("");
          }}
          required
          value={effectiveSelectedProductId}
        >
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.sku} - {product.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm font-medium">
        Barkod / QR
        <input
          className={inputClass}
          onChange={(event) => resolveScannedValue(event.target.value)}
          placeholder={selectedProduct?.barcode ?? selectedProduct?.sku}
          value={scannedValue}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          className={buttonClass}
          disabled={isScanning || products.length === 0}
          onClick={startCamera}
          type="button"
        >
          <Camera aria-hidden="true" className="size-4" />
          Kamera
        </button>
        <button
          className={subtleButtonClass}
          disabled={!isScanning}
          onClick={() => stopCamera()}
          type="button"
        >
          <Square aria-hidden="true" className="size-4" />
          Durdur
        </button>
      </div>

      <div className="overflow-hidden rounded-md border border-[#d8dbd2] bg-[#111816]">
        <video
          className={isScanning ? "aspect-video w-full object-cover" : "hidden"}
          muted
          playsInline
          ref={videoRef}
        />
        {!isScanning ? (
          <div className="flex aspect-video items-center justify-center text-[#dce5df]">
            <ScanLine aria-hidden="true" className="size-8" />
          </div>
        ) : null}
      </div>

      {visibleMessage ? (
        <p aria-live="polite" className="text-sm text-[#52605a]">
          {visibleMessage}
        </p>
      ) : null}
    </div>
  );
}
