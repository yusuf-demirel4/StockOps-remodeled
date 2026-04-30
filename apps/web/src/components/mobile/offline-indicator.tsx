"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
     
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-2 text-xs font-medium text-slate-900 shadow-md">
      <WifiOff aria-hidden="true" className="size-4" />
      Çevrimdışısınız — sayım kayıtları kuyruğa alınacak.
    </div>
  );
}
