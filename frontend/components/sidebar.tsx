"use client";

import { cn } from "@/lib/utils";
import { Home, Shield, LineChart, Settings, Wallet, Menu, X, Users, Globe, Vote, ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useNetwork, NetworkType } from "@/app/context/NetworkContext";
import { useCurrency, Currency } from "@/app/context/CurrencyContext";
import { usePrices } from "@/app/context/PriceContext";
import { NotificationBell } from "./NotificationBell";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/vault", label: "Vault", icon: Shield },
  { href: "/strategies", label: "Strategies", icon: LineChart },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/referrals", label: "Referrals", icon: Users },
  { href: "/bridge", label: "Bridge", icon: ArrowLeftRight },
  { href: "/governance", label: "Governance", icon: Vote },
  { href: "/settings", label: "Settings", icon: Settings },
];

import { useI18n, useTranslations } from "@/lib/i18n-context";

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { network, setNetwork } = useNetwork();
  const { currency, setCurrency } = useCurrency();
  const { prices, loading } = usePrices();
  const { locale, setLocale, t } = useI18n();
  const navT = useTranslations("Navigation");

  const translatedNavItems = navItems.map(item => ({
    ...item,
    label: navT(item.label.toLowerCase())
  }));

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="sidebar-nav"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-sidebar border border-sidebar-border focus-visible:ring-2 focus-visible:ring-ring"
      >
        {isOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
      </button>

      <div className="fixed top-4 right-4 z-50 lg:hidden">
        <NotificationBell className="bg-sidebar border border-sidebar-border shadow-sm" />
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setIsOpen(false)}
          role="button"
          tabIndex={-1}
          aria-label="Close navigation menu"
        />
      )}

      <aside
        id="sidebar-nav"
        aria-label="Main navigation"
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold text-foreground">XHedge</span>
            </div>
            <NotificationBell className="hidden lg:flex" />
          </div>

          <nav aria-label="Primary" className="flex-1 px-3 py-4 space-y-1">
            {translatedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  id={`tour-sidebar-${item.label?.toLocaleLowerCase()}`}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-sidebar-border">
            {/* Language Switcher */}
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Globe className="w-3 h-3" />
                <span>{navT('switchLanguage')}</span>
              </div>
              <div className="grid grid-cols-2 gap-1" role="group" aria-label="Select language">
                <button
                  onClick={() => setLocale('en')}
                  aria-pressed={locale === 'en'}
                  aria-label="Switch to English"
                  className={cn(
                    "flex items-center justify-center px-3 py-2 rounded-md text-xs font-medium transition-all",
                    locale === 'en'
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  English
                </button>
                <button
                  onClick={() => setLocale('es')}
                  aria-pressed={locale === 'es'}
                  aria-label="Switch to Español"
                  className={cn(
                    "flex items-center justify-center px-3 py-2 rounded-md text-xs font-medium transition-all",
                    locale === 'es'
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  Español
                </button>
              </div>
            </div>

            {/* Currency Switcher */}
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Currency</span>
              </div>
              <div className="grid grid-cols-2 gap-1" id="tour-sidebar-currency" role="group" aria-label="Select currency">
                <button
                  onClick={() => setCurrency(Currency.USD)}
                  aria-pressed={currency === Currency.USD}
                  aria-label="Use US Dollar currency"
                  className={cn(
                    "flex items-center justify-center px-3 py-2 rounded-md text-xs font-medium transition-all",
                    currency === Currency.USD
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  USD ($)
                </button>
                <button
                  onClick={() => setCurrency(Currency.NGN)}
                  aria-pressed={currency === Currency.NGN}
                  aria-label="Use Nigerian Naira currency"
                  className={cn(
                    "flex items-center justify-center px-3 py-2 rounded-md text-xs font-medium transition-all",
                    currency === Currency.NGN
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  NGN (₦)
                </button>
              </div>
            </div>

            {/* Network Switcher */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Globe className="w-3 h-3" />
                <span>Network</span>
              </div>
              <div className="grid grid-cols-1 gap-1" role="group" aria-label="Select network">
                {Object.values(NetworkType).map((net) => (
                  <button
                    key={net}
                    onClick={() => setNetwork(net)}
                    aria-pressed={network === net}
                    aria-label={`Switch to ${net} network`}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all",
                      network === net
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <span className="capitalize">{net}</span>
                    {network === net && <div className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Real-time Prices */}
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center gap-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <LineChart className="w-3 h-3" />
                <span>Live Prices</span>
              </div>
              <div className="grid grid-cols-2 gap-1 px-3 py-2 bg-muted/30 rounded-lg text-sm border border-sidebar-border">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">XLM</span>
                  <span className="font-medium text-foreground">
                    {loading ? "..." : `$${prices.XLM.toFixed(4)}`}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">USDC</span>
                  <span className="font-medium text-foreground">
                    {loading ? "..." : `$${prices.USDC.toFixed(4)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-sidebar-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">XH</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">XHedge</span>
                <span className="text-xs text-muted-foreground">Volatility Shield</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
