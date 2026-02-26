"use client";

import { ThemeProvider } from "next-themes";
import { NetworkProvider } from "./context/NetworkContext";
import { FreighterProvider } from "./context/FreighterContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { PriceProvider } from "./context/PriceContext";
import { ReactNode } from "react";
import { TourProvider } from "@/components/TourContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FreighterProvider>
        <NetworkProvider>
          <TourProvider>
            <CurrencyProvider>
              <PriceProvider>
                {children}
              </PriceProvider>
            </CurrencyProvider>
          </TourProvider>
        </NetworkProvider>
      </FreighterProvider>
    </ThemeProvider>
  );
}
