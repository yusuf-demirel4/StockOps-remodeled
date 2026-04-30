"use client";

import { Camera, ScanLine, Square } from "lucide-react";
import { useEffect, useState } from "react";

import { useBarcodeScanner } from "@/components/barcode-scanner";

type Props = {
  onScan: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  hint?: string;
};

export function MobileScanInput({ onScan, placeholder, autoFocus, hint }: Props) {
  const [manual, setManual] = useState("");
  const { isScanning, message, startCamera, stopCamera, videoRef } =
    useBarcodeScanner({
      onDetected: (value) => {
        setManual(value);
        onScan(value);
      },
    });

  useEffect(() => () => stopCamera(false), [stopCamera]);

  const submit = () => {
    const trimmed = manual.trim();
    if (!trimmed) return;
    onScan(trimmed);
  };

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/60">
        <video
          className={isScanning ? "aspect-video w-full object-cover" : "hidden"}
          muted
          playsInline
          ref={videoRef}
        />
        {!isScanning ? (
          <div className="flex aspect-video items-center justify-center text-slate-600">
            <ScanLine aria-hidden="true" className="size-12" />
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
        <button
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white active:bg-indigo-400 disabled:opacity-50"
          disabled={isScanning}
          onClick={startCamera}
          type="button"
        >
          <Camera aria-hidden="true" className="size-5" />
          Kamera
        </button>
        <button
          className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-medium text-slate-200 active:bg-white/5 disabled:opacity-50"
          disabled={!isScanning}
          onClick={() => stopCamera()}
          type="button"
        >
          <Square aria-hidden="true" className="size-5" />
          Durdur
        </button>
      </div>

      <div className="flex gap-2">
        <input
          autoFocus={autoFocus}
          className="flex-1 rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
          inputMode="text"
          onChange={(event) => setManual(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder ?? "SKU veya barkod"}
          value={manual}
        />
        <button
          className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white active:bg-emerald-400"
          onClick={submit}
          type="button"
        >
          Ara
        </button>
      </div>

      {(hint || message) && (
        <p aria-live="polite" className="text-xs text-slate-400">
          {message || hint}
        </p>
      )}
    </div>
  );
}
