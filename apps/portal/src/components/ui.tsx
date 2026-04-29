import type { ReactNode } from "react";
import { clsx } from "clsx";

export function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-sm",
        className,
      )}
    >
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        tone === "neutral" && "bg-[var(--neutral-badge-bg)] text-[var(--neutral-badge-text)]",
        tone === "success" && "bg-[var(--accent-success-bg)] text-[var(--accent-success-text)]",
        tone === "warning" && "bg-[var(--accent-warning-bg)] text-[var(--accent-warning-text)]",
        tone === "danger" && "bg-[var(--accent-danger-bg)] text-[var(--accent-danger-text)]",
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
      {children}
    </div>
  );
}

export const inputClass =
  "h-10 w-full rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--placeholder)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]";

export const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]";

export const subtleButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--border-input)] bg-[var(--bg-card)] px-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]";
