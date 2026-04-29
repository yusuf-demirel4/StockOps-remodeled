import Link from "next/link";
import {
  FileText,
  LogOut,
  Package,
  ShoppingCart,
  LayoutDashboard,
} from "lucide-react";
import type { ReactNode } from "react";
import { signOutAction } from "@/lib/actions";

const navigation = [
  { href: "/", label: "Ana Sayfa", icon: LayoutDashboard },
  { href: "/catalog", label: "Ürün Kataloğu", icon: Package },
  { href: "/orders", label: "Siparişlerim", icon: ShoppingCart },
  { href: "/invoices", label: "Faturalarım", icon: FileText },
];

type PortalShellProps = {
  children: ReactNode;
  title: string;
  description: string;
  customerName: string;
  organizationName: string;
  logoUrl?: string;
};

export function PortalShell({
  children,
  title,
  description,
  customerName,
  organizationName,
  logoUrl,
}: PortalShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:px-6 lg:py-6">
            <div>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={organizationName}
                  className="mb-2 h-8 w-auto"
                />
              ) : (
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--text-secondary)]">
                  {organizationName}
                </p>
              )}
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                B2B Portal
              </p>
              <p className="mt-2 text-sm font-medium">{customerName}</p>
            </div>
            <form action={signOutAction} className="lg:mt-4">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-input)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                <LogOut className="size-3.5" />
                Çıkış
              </button>
            </form>
          </div>

          <nav className="hidden px-3 pb-6 lg:block">
            <ul className="grid gap-0.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {description}
            </p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
