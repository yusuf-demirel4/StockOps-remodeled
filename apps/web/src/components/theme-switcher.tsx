"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import type { ThemeMode } from "@/lib/theme";

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Açık", icon: Sun },
  { value: "dark", label: "Koyu", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
];

export function ThemeSwitcher() {
  const { mode, setMode } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-1">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setMode(opt.value)}
            className={`inline-flex size-7 items-center justify-center rounded-md text-xs transition ${
              active
                ? "bg-[var(--accent-primary)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            <Icon aria-hidden="true" className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
