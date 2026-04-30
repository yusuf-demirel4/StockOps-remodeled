import type { ComponentType, ReactNode } from "react";
import { clsx } from "clsx";
import type { LucideProps } from "lucide-react";

export function StatCard({
  title,
  value,
  caption,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  caption: string;
  icon: ComponentType<LucideProps>;
  tone?: "default" | "critical" | "success" | "warning";
}) {
  return (
    <div className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <span
          className={clsx(
            "rounded-md p-2",
            tone === "critical" && "bg-[var(--accent-danger-bg)] text-[var(--accent-danger-text)]",
            tone === "success" && "bg-[var(--accent-success-bg)] text-[var(--accent-success-text)]",
            tone === "warning" && "bg-[var(--accent-warning-bg)] text-[var(--accent-warning-text)]",
            tone === "default" && "bg-[var(--accent-info-bg)] text-[var(--accent-info-text)]",
          )}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>
      <p className="mt-4 text-sm text-[var(--text-secondary)]">{caption}</p>
    </div>
  );
}

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
        "rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-card)] shadow-sm",
        className,
      )}
    >
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-panel-heading)]">{title}</h3>
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
        "status-badge inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        tone === "neutral" && "bg-[var(--neutral-badge-bg)] text-[var(--neutral-badge-text)]",
        tone === "success" && "bg-[var(--accent-success-bg2)] text-[var(--accent-success-text2)]",
        tone === "warning" && "bg-[var(--accent-warning-bg2)] text-[var(--accent-warning-text2)]",
        tone === "danger" && "bg-[var(--accent-danger-bg2)] text-[var(--accent-danger-text2)]",
      )}
    >
      {children}
    </span>
  );
}

export const inputClass =
  "h-10 w-full rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--placeholder)] focus:border-[var(--accent-secondary)] focus:ring-2 focus:ring-[var(--accent-ring)]";

export const selectClass = inputClass;

export const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]";

export const subtleButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--border-input)] bg-[var(--bg-card)] px-3 text-sm font-semibold text-[var(--text-body)] transition hover:bg-[var(--bg-hover)]";

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--border-dashed)] bg-[var(--bg-empty)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
      {children}
    </div>
  );
}
