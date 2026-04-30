import type { ReactNode } from "react";

import { InstallPrompt } from "@/components/mobile/install-prompt";
import { MobileNav } from "@/components/mobile/mobile-nav";
import { OfflineIndicator } from "@/components/mobile/offline-indicator";
import { ServiceWorkerRegistrar } from "@/components/mobile/sw-register";

export default function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <ServiceWorkerRegistrar />
      <OfflineIndicator />
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      <InstallPrompt />
      <MobileNav />
    </div>
  );
}
