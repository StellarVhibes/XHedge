"use client";

import { ThemeProvider } from "next-themes";
import { NetworkProvider } from "./context/NetworkContext";
import { FreighterProvider } from "./context/FreighterContext";
import { VaultProvider } from "./context/VaultContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { PriceProvider } from "./context/PriceContext";
import { PartnerAuthProvider } from "./context/PartnerAuthContext";
import { ReactNode } from "react";
import { TourProvider } from "@/components/TourContext";
import { Toaster } from "sonner";
import { NotificationProvider } from "./context/NotificationContext";
import { I18nProvider } from "@/lib/i18n-context";

import { NotificationDrawer } from "@/components/NotificationDrawer";

interface ProvidersProps {
  children: ReactNode;
  nonce?: string;
}

export function Providers({ children, nonce }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce}>
      <I18nProvider>
        <FreighterProvider>
          <NetworkProvider>
            <TourProvider>
              <CurrencyProvider>
                <PriceProvider>
                  <PartnerAuthProvider>
                    <NotificationProvider>
                      <VaultProvider>
                        {children}
                      </VaultProvider>
                      <NotificationDrawer />
                    </NotificationProvider>
                  </PartnerAuthProvider>
                </PriceProvider>
              </CurrencyProvider>
            </TourProvider>
          </NetworkProvider>
        </FreighterProvider>
        <Toaster richColors closeButton position="top-right" />
      </I18nProvider>    </ThemeProvider>
  );
}
