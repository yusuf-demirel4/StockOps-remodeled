"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

type BarcodeDetectorResult = {
  rawValue: string;
};

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

type BarcodeWindow = Window &
  typeof globalThis & {
    BarcodeDetector?: BarcodeDetectorConstructor;
  };

const barcodeFormats = [
  "qr_code",
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
];

export function useBarcodeScanner({
  onDetected,
}: {
  onDetected: (value: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const animationRef = useRef<number | null>(null);
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const stopCamera = useCallback((updateState = true) => {
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (updateState) {
      setIsScanning(false);
    }
  }, []);

  const scanVideo = useCallback(
    (barcodeWindow: BarcodeWindow) => {
      const Detector = barcodeWindow.BarcodeDetector;

      if (!Detector) {
        stopCamera();
        setMessage("Barkod okuyucu başlatılamadı.");
        return;
      }

      const detector = new Detector({ formats: barcodeFormats });

      const scanFrame = async () => {
        const video = videoRef.current;

        if (!video || !streamRef.current) {
          return;
        }

        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const results = await detector.detect(video).catch(() => []);
          const rawValue = results[0]?.rawValue;

          if (rawValue) {
            onDetectedRef.current(rawValue);
            stopCamera();
            return;
          }
        }

        animationRef.current = window.requestAnimationFrame(scanFrame);
      };

      animationRef.current = window.requestAnimationFrame(scanFrame);
    },
    [stopCamera],
  );

  const startZxingCamera = useCallback(
    async (video: HTMLVideoElement) => {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();

      const controls = await reader
        .decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
            },
          },
          video,
          (result, _error, activeControls) => {
            const rawValue = result?.getText();

            if (!rawValue) {
              return;
            }

            onDetectedRef.current(rawValue);
            activeControls.stop();
            zxingControlsRef.current = null;
            setIsScanning(false);
          },
        )
        .catch(() => null);

      if (!controls) {
        stopCamera();
        setMessage("Kamera açılamadı.");
        return;
      }

      zxingControlsRef.current = controls;
    },
    [stopCamera],
  );

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Kamera erişimi kullanılamıyor.");
      return;
    }

    const video = videoRef.current;

    if (!video) {
      setMessage("Kamera önizlemesi başlatılamadı.");
      return;
    }

    const barcodeWindow = window as BarcodeWindow;

    stopCamera(false);
    setIsScanning(true);
    setMessage("");

    if (!barcodeWindow.BarcodeDetector) {
      await startZxingCamera(video);
      return;
    }

    const stream = await navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
      })
      .catch(() => null);

    if (!stream) {
      stopCamera();
      setMessage("Kamera açılamadı.");
      return;
    }

    streamRef.current = stream;
    video.srcObject = stream;
    await video.play().catch(() => {
      stopCamera();
      setMessage("Kamera başlatılamadı.");
    });

    if (!streamRef.current) {
      return;
    }

    scanVideo(barcodeWindow);
  }, [scanVideo, startZxingCamera, stopCamera]);

  useEffect(() => () => stopCamera(false), [stopCamera]);

  return {
    isScanning,
    message,
    startCamera,
    stopCamera,
    videoRef,
  };
}
