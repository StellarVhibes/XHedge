"use client";

import { Shield, ArrowDownToLine } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-12 h-12 text-primary" />
        <h1 className="text-4xl font-bold text-foreground">XHedge</h1>
      </div>
      <p className="text-xl text-muted-foreground mb-8">
        Volatility Shield for Weak Currencies
      </p>
      
      <div className="grid gap-4 md:grid-cols-2 max-w-2xl w-full">
        <Link
          href="/vault"
          className="flex items-center gap-4 p-6 rounded-lg border bg-card hover:bg-accent transition-colors"
        >
          <ArrowDownToLine className="w-8 h-8 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">Withdraw Funds</h2>
            <p className="text-sm text-muted-foreground">
              Withdraw your assets from the vault
            </p>
          </div>
        </Link>
        
        <div className="flex items-center gap-4 p-6 rounded-lg border bg-card opacity-50">
          <Shield className="w-8 h-8 text-muted-foreground" />
          <div>
            <h2 className="font-semibold text-foreground">Deposit Funds</h2>
            <p className="text-sm text-muted-foreground">
              Coming soon
            </p>
          </div>
        </div>
      </div>
    </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Total Value Locked</span>
            <span className="text-2xl font-bold">$1,234,567</span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Active Strategies</span>
            <span className="text-2xl font-bold">12</span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Your Shares</span>
            <span className="text-2xl font-bold">1,000 XHS</span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">APY</span>
            <span className="text-2xl font-bold text-primary">8.5%</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
            Deposit
          </button>
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
            Withdraw
          </button>
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
            View Strategies
          </button>
        </div>
=======
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-12 h-12 text-primary" />
        <h1 className="text-4xl font-bold text-foreground">XHedge</h1>
      </div>
      <p className="text-xl text-muted-foreground mb-8">
        Volatility Shield for Weak Currencies
      </p>
      
      <div className="grid gap-4 md:grid-cols-2 max-w-2xl w-full">
        <Link
          href="/vault"
          className="flex items-center gap-4 p-6 rounded-lg border bg-card hover:bg-accent transition-colors"
        >
          <ArrowDownToLine className="w-8 h-8 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">Withdraw Funds</h2>
            <p className="text-sm text-muted-foreground">
              Withdraw your assets from the vault
            </p>
          </div>
        </Link>
        
        <div className="flex items-center gap-4 p-6 rounded-lg border bg-card opacity-50">
          <Shield className="w-8 h-8 text-muted-foreground" />
          <div>
            <h2 className="font-semibold text-foreground">Deposit Funds</h2>
            <p className="text-sm text-muted-foreground">
              Coming soon
            </p>
          </div>
        </div>
>>>>>>> 6347b45 (Resolves #109 [FE-25] Withdraw Tab Logic)
      </div>
    </div>
  );
}
