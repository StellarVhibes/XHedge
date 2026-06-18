"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

// Static lookup — zero allocation per render
const ICON: Readonly<Record<Theme, React.ElementType>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

// aria-label describes the *action* (what clicking will do next)
const ARIA_LABEL: Readonly<Record<Theme, string>> = {
  system: "Switch to light mode",
  light: "Switch to dark mode",
  dark: "Switch to system theme",
} as const;

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, cycleTheme } = useTheme();
  const Icon = ICON[theme];

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={ARIA_LABEL[theme]}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        className
      )}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}
