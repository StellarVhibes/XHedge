import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <ErrorBoundary>
            <DashboardLayout>{children}</DashboardLayout>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
