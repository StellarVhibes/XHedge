"use client";

import { useTheme as useNextTheme } from "next-themes";

export type Theme = "light" | "dark" | "system";

// Deterministic O(1) cycle map — no runtime allocation per call
const NEXT_THEME: Readonly<Record<Theme, Theme>> = {
  system: "light",
  light: "dark",
  dark: "system",
} as const;

export interface UseThemeReturn {
  /** The stored user preference: "light" | "dark" | "system" */
  theme: Theme;
  /** The actual rendered theme after resolving "system" — undefined during SSR */
  resolvedTheme: "light" | "dark" | undefined;
  /** Set theme directly */
  setTheme: (theme: Theme) => void;
  /** Rotate through system → light → dark → system */
  cycleTheme: () => void;
}

export function useTheme(): UseThemeReturn {
  const { theme, resolvedTheme, setTheme } = useNextTheme();

  const current = (theme as Theme) ?? "system";

  return {
    theme: current,
    resolvedTheme: resolvedTheme as "light" | "dark" | undefined,
    setTheme: (t: Theme) => setTheme(t),
    cycleTheme: () => setTheme(NEXT_THEME[current]),
  };
}
