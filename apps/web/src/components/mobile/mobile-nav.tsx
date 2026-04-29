"use client";

import { ClipboardCheck, Home, PackageCheck, Scan } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/mobile", label: "Ana", icon: Home, exact: true },
  { href: "/mobile/receive", label: "Teslim al", icon: PackageCheck, exact: false },
  { href: "/mobile/pick", label: "Topla", icon: ClipboardCheck, exact: false },
  { href: "/mobile/stocktake", label: "Sayım", icon: Scan, exact: false },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-4 border-t border-white/10 bg-slate-950/95 backdrop-blur">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname?.startsWith(href);
        return (
          <Link
            className={`flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-medium ${
              active ? "text-indigo-300" : "text-slate-400"
            }`}
            href={href}
            key={href}
          >
            <Icon aria-hidden="true" className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
