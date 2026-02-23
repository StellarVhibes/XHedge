"use client";

import { cn } from "@/lib/utils";
import { Home, Shield, LineChart, Settings, Wallet, Menu, X, Users, Globe } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useNetwork, NetworkType } from "@/app/context/NetworkContext";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/vault", label: "Vault", icon: Shield },
  { href: "/strategies", label: "Strategies", icon: LineChart },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/referrals", label: "Referrals", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { network, setNetwork } = useNetwork();

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-sidebar border border-sidebar-border"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-foreground">XHedge</span>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-sidebar-border">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Globe className="w-3 h-3" />
                <span>Network</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {Object.values(NetworkType).map((net) => (
                  <button
                    key={net}
                    onClick={() => setNetwork(net)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all",
                      network === net
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <span className="capitalize">{net}</span>
                    {network === net && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
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
