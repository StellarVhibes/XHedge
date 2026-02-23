"use client";

import { ThemeProvider } from "next-themes";
import { FreighterProvider } from "./context/FreighterContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FreighterProvider>
        {children}
      </FreighterProvider>
    </ThemeProvider>
  );
}
