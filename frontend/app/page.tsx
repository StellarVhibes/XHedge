"use client";

import { VaultOverviewCard } from "@/components/vault-overview-card";
import { Shield, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import Link from "next/link";
import { WalletButton } from "./components/WalletButton";

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">XHedge</h1>
              <p className="text-muted-foreground">Volatility Shield for Weak Currencies</p>
            </div>
          </div>
          <WalletButton />
        </div>

        <VaultOverviewCard />

        <div className="grid gap-4 md:grid-cols-2">
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
    </div>
  );
}
