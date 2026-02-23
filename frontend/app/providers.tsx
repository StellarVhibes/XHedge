"use client";

import { ThemeProvider } from "next-themes";
import { NetworkProvider } from "./context/NetworkContext";
import { FreighterProvider } from "./context/FreighterContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FreighterProvider>
        <NetworkProvider>
          {children}
        </NetworkProvider>
      </FreighterProvider>
    </ThemeProvider>
  );
}
