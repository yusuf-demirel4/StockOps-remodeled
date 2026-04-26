"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Square } from "lucide-react";
import { useBarcodeScanner } from "@/components/barcode-scanner";
import { buttonClass, inputClass, subtleButtonClass } from "./ui";

export function BarcodeValueInput({
  defaultValue = "",
  label = "Barkod",
  name = "barcode",
  placeholder,
}: {
  defaultValue?: string;
  label?: string;
  name?: string;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const applyScannedValue = useCallback((value: string) => {
    if (inputRef.current) {
      inputRef.current.value = value;
    }

    setMessage("Barkod okutuldu.");
  }, []);
  const {
    isScanning,
    message: scannerMessage,
    startCamera,
    stopCamera,
    videoRef,
  } = useBarcodeScanner({ onDetected: applyScannedValue });
  const visibleMessage = message || scannerMessage;

  return (
    <div className="grid gap-2">
      <label className="grid gap-1.5 text-sm font-medium">
        {label}
        <input
          className={inputClass}
          defaultValue={defaultValue}
          name={name}
          onChange={() => setMessage("")}
          placeholder={placeholder}
          ref={inputRef}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          className={buttonClass}
          disabled={isScanning}
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

      <div
        className={
          isScanning
            ? "overflow-hidden rounded-md border border-[#d8dbd2] bg-[#111816]"
            : "hidden"
        }
      >
        <video
          className="aspect-video w-full object-cover"
          muted
          playsInline
          ref={videoRef}
        />
      </div>

      {visibleMessage ? (
        <p aria-live="polite" className="text-sm text-[#52605a]">
          {visibleMessage}
        </p>
      ) : null}
    </div>
  );
}
