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
    <div className="rounded-lg border border-[#d8dbd2] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#66706b]">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <span
          className={clsx(
            "rounded-md p-2",
            tone === "critical" && "bg-[#ffe5df] text-[#a43c25]",
            tone === "success" && "bg-[#e0f2e9] text-[#1f7a4d]",
            tone === "warning" && "bg-[#fff2c9] text-[#916800]",
            tone === "default" && "bg-[#e9eef0] text-[#3b5f6f]",
          )}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>
      <p className="mt-4 text-sm text-[#66706b]">{caption}</p>
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
        "rounded-lg border border-[#d8dbd2] bg-white shadow-sm",
        className,
      )}
    >
      <div className="border-b border-[#e3e5dd] px-4 py-3">
        <h3 className="text-sm font-semibold text-[#26302c]">{title}</h3>
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
        tone === "neutral" && "bg-[#eef0ec] text-[#52605a]",
        tone === "success" && "bg-[#dff3e8] text-[#177347]",
        tone === "warning" && "bg-[#fff0bf] text-[#866100]",
        tone === "danger" && "bg-[#ffe1d9] text-[#a23922]",
      )}
    >
      {children}
    </span>
  );
}

export const inputClass =
  "h-10 w-full rounded-md border border-[#cfd3c8] bg-white px-3 text-sm text-[#1f2523] outline-none transition placeholder:text-[#8a938e] focus:border-[#3d7b66] focus:ring-2 focus:ring-[#3d7b66]/15";

export const selectClass = inputClass;

export const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#236d5a] px-4 text-sm font-semibold text-white transition hover:bg-[#195845] focus:outline-none focus:ring-2 focus:ring-[#236d5a]/30";

export const subtleButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#cfd3c8] bg-white px-3 text-sm font-semibold text-[#27322e] transition hover:bg-[#f1f4ee]";

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-[#d5d8cf] bg-[#fafbf7] px-4 py-8 text-center text-sm text-[#66706b]">
      {children}
    </div>
  );
}
