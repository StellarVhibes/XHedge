"use client";

import { ThemeProvider } from "next-themes";
import { NetworkProvider } from "./context/NetworkContext";
import { FreighterProvider } from "./context/FreighterContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { PriceProvider } from "./context/PriceContext";
import { PartnerAuthProvider } from "./context/PartnerAuthContext";
import { ReactNode } from "react";
import { TourProvider } from "@/components/TourContext";
import { Toaster } from "sonner";

import { I18nProvider } from "@/lib/i18n-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nProvider>
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
        <Toaster richColors closeButton position="top-right" />
      </I18nProvider>
    </ThemeProvider>
  );
}
