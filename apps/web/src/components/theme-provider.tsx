"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ThemeMode } from "@/lib/theme";
import { THEME_COOKIE, THEME_STORAGE_KEY, resolveTheme } from "@/lib/theme";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  setMode: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({
  children,
  initialMode,
}: {
  children: React.ReactNode;
  initialMode: ThemeMode;
}) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  const apply = useCallback((m: ThemeMode) => {
    const resolved = resolveTheme(m);
    document.documentElement.setAttribute("data-theme", resolved);
  }, []);

  const setMode = useCallback(
    (m: ThemeMode) => {
      setModeState(m);
      localStorage.setItem(THEME_STORAGE_KEY, m);
      document.cookie = `${THEME_COOKIE}=${m};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      apply(m);
    },
    [apply],
  );

  useEffect(() => {
    apply(mode);
  }, [apply, mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, apply]);

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
