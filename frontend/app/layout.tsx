import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "XHedge - Volatility Shield",
  description: "Stablecoin Volatility Shield for Weak Currencies",
  openGraph: {
    title: "XHedge - Volatility Shield",
    description: "Stablecoin Volatility Shield for Weak Currencies",
    url: "https://xhedge.app",
    siteName: "XHedge",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XHedge - Volatility Shield",
    description: "Stablecoin Volatility Shield for Weak Currencies",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the nonce injected by middleware for CSP nonce-based script loading
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers nonce={nonce}>
          <ErrorBoundary>
            <DashboardLayout>{children}</DashboardLayout>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
