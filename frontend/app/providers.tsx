"use client";

import { ThemeProvider } from "next-themes";
import { NetworkProvider } from "./context/NetworkContext";
import { FreighterProvider } from "./context/FreighterContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { PriceProvider } from "./context/PriceContext";
import { PartnerAuthProvider } from "./context/PartnerAuthContext";
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
                <PartnerAuthProvider>
                  {children}
                </PartnerAuthProvider>
              </PriceProvider>
            </CurrencyProvider>
          </TourProvider>
        </NetworkProvider>
      </FreighterProvider>
    </ThemeProvider>
  );
}
