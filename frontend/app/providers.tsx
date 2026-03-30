"use client";

import { ThemeProvider } from "next-themes";
import { FreighterProvider } from "./context/FreighterContext";
import { VaultProvider } from "./context/VaultContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FreighterProvider>
        <VaultProvider>
          {children}
        </VaultProvider>
      </FreighterProvider>
    </ThemeProvider>
  );
}
