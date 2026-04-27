import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PwaServiceWorker } from "./components/PwaServiceWorker";

export const metadata: Metadata = {
  title: "XHedge - Volatility Shield",
  description: "Stablecoin Volatility Shield for Weak Currencies",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.svg", type: "image/svg+xml", sizes: "192x192" },
      { url: "/icons/icon-512x512.svg", type: "image/svg+xml", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/icon-192x192.svg", sizes: "192x192" }],
  },
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

export const viewport: Viewport = {
  themeColor: "#0f172a",
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
        {/* Skip-to-content link: first focusable element for keyboard/SR users */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <PwaServiceWorker />
        <Providers nonce={nonce}>
          <ErrorBoundary>
            <DashboardLayout>{children}</DashboardLayout>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
