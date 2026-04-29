export type ThemeMode = "light" | "dark" | "system";

export const THEME_COOKIE = "stockops_theme";
export const THEME_STORAGE_KEY = "stockops_theme";

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  }
  return mode;
}
