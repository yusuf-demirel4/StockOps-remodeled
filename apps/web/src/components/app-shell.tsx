import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileText,
  LogOut,
  Package,
  Settings,
  Truck,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { signOutAction } from "@/lib/actions";
import type { Role } from "@stockops/core/types";

const navigation = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/products", label: "Ürünler", icon: Package },
  { href: "/inventory", label: "Stok", icon: Boxes },
  { href: "/customers", label: "Müşteriler", icon: Users },
  { href: "/orders", label: "Siparişler", icon: ClipboardList },
  { href: "/invoices", label: "Faturalar", icon: FileText },
  { href: "/suppliers", label: "Tedarikçiler", icon: Truck },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

type AppShellProps = {
  children: ReactNode;
  title: string;
  description: string;
  organizationName: string;
  role: Role;
  userName: string;
};

export function AppShell({
  children,
  title,
  description,
  organizationName,
  role,
  userName,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#1f2523]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row">
        <aside className="border-b border-[#deded2] bg-[#fbfbf6] lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:px-6 lg:py-7">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#66706b]">
                StockOps
              </p>
              <h1 className="mt-2 text-lg font-semibold">{organizationName}</h1>
              <p className="mt-1 text-sm text-[#66706b]">{userName}</p>
            </div>
            <div className="flex items-center gap-2 lg:mt-4">
              <span className="rounded-md border border-[#cfd3c8] bg-white px-2.5 py-1 font-mono text-xs text-[#4d5753]">
                {role}
              </span>
              <form action={signOutAction}>
                <button
                  aria-label="Çıkış yap"
                  className="inline-flex size-8 items-center justify-center rounded-md border border-[#cfd3c8] bg-white text-[#4d5753] transition hover:bg-[#f1f4ee]"
                  title="Çıkış yap"
                  type="submit"
                >
                  <LogOut aria-hidden="true" className="size-4" />
                </button>
              </form>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:px-4">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className="flex min-w-max items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-[#42504a] transition hover:bg-[#edf1e8] hover:text-[#17211d] lg:min-w-0"
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1">
          <header className="border-b border-[#deded2] bg-[#fdfdf8]/90 px-5 py-5 backdrop-blur lg:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#65706b]">
              Operasyon Paneli
            </p>
            <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#1c2420]">
                  {title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-[#63706a]">
                  {description}
                </p>
              </div>
            </div>
          </header>
          <div className="px-5 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
