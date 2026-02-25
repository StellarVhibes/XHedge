"use client";

import { ThemeProvider } from "next-themes";
import { NetworkProvider } from "./context/NetworkContext";
import { FreighterProvider } from "./context/FreighterContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { PriceProvider } from "./context/PriceContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FreighterProvider>
        <NetworkProvider>
          <CurrencyProvider>
            <PriceProvider>
              {children}
            </PriceProvider>
          </CurrencyProvider>
        </NetworkProvider>
      </FreighterProvider>
    </ThemeProvider>
  );
}
