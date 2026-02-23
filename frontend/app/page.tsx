"use client";

import { VaultOverviewCard } from "@/components/vault-overview-card";
import { Shield, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import Link from "next/link";
import { WalletButton } from "./components/WalletButton";
import { AiInsightStream } from "./components/AiInsightStream";

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-10 w-10 text-primary" />
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
            className="flex items-center gap-4 rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
          >
            <ArrowUpFromLine className="h-8 w-8 text-primary" />
            <div>
              <h2 className="font-semibold text-foreground">Deposit Funds</h2>
              <p className="text-sm text-muted-foreground">Deposit assets into the vault</p>
            </div>
          </Link>

          <Link
            href="/vault"
            className="flex items-center gap-4 rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
          >
            <ArrowDownToLine className="h-8 w-8 text-primary" />
            <div>
              <h2 className="font-semibold text-foreground">Withdraw Funds</h2>
              <p className="text-sm text-muted-foreground">
                Withdraw your assets from the vault
              </p>
            </div>
          </Link>
        </div>

        <AiInsightStream />
      </div>
    </div>
  );
}
