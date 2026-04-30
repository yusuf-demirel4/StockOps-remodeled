"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
};

const DISMISS_KEY = "stockops-install-dismissed";

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage?.getItem(DISMISS_KEY)) {
      setDismissed(true);
      return;
    }

    const handler = (incoming: Event) => {
      incoming.preventDefault();
      setEvent(incoming as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!event || dismissed) return null;

  const handleInstall = async () => {
    await event.prompt();
    const result = await event.userChoice.catch(() => null);
    if (result?.outcome) {
      setEvent(null);
    }
  };

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage?.setItem(DISMISS_KEY, "1");
    }
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 shadow-lg backdrop-blur">
      <Download aria-hidden="true" className="size-5 text-indigo-400" />
      <div className="flex-1">
        <div className="font-medium">StockOps&apos;u yükle</div>
        <div className="text-xs text-slate-300">Ana ekrana ekle, kameradan tara, çevrimdışı çalış.</div>
      </div>
      <button
        className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400"
        onClick={handleInstall}
        type="button"
      >
        Yükle
      </button>
      <button
        aria-label="Kapat"
        className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
        onClick={handleDismiss}
        type="button"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
