import Link from "next/link";
import { HelpCircle } from "lucide-react";

import { Panel } from "./ui";

type ContextualHelpProps = {
  title: string;
  items: Array<{
    label: string;
    detail: string;
    href?: string;
  }>;
};

export function ContextualHelp({ title, items }: ContextualHelpProps) {
  return (
    <Panel title={title}>
      <div className="grid gap-3">
        {items.map((item) => (
          <div
            className="flex gap-3 rounded-md border border-[var(--border-table)] bg-[var(--bg-empty)] px-3 py-3"
            key={item.label}
          >
            <HelpCircle
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-[var(--accent-secondary)]"
            />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {item.href ? (
                  <Link className="hover:underline" href={item.href}>
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
