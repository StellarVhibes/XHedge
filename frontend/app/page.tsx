"use client";

import { Shield, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
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
          <ArrowUpFromLine className="w-8 h-8 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">Deposit Funds</h2>
            <p className="text-sm text-muted-foreground">
              Deposit assets into the vault
            </p>
          </div>
        </Link>
        
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
      </div>
    </div>
  );
}
