"use client";
import { useState, useEffect } from 'react';
import { VaultOverviewCard } from "@/components/vault-overview-card";
import { Shield, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import Link from "next/link";
import { WalletButton } from "./components/WalletButton";
import { AiInsightStream } from "./components/AiInsightStream";
import { TransactionList } from "@/components/transaction-list";
import { RewardSummary } from "@/components/reward-summary";
import { PerformanceAttribution } from "@/components/PerformanceAttribution";
interface Slice {
  name: string;
  value: number;
}
import { RiskChart } from "@/components/RiskChart";

import { useTranslations } from "@/lib/i18n-context";

export default function Home() {
  const t = useTranslations("Home");
  const commonT = useTranslations("Common");
  const [slices, setSlices] = useState<{ name: string; value: number }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch('/api/allocation')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.slices) setSlices(data.slices);
        else setError(t('noAllocationData'));
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [t]);

  return (
    <div className="min-h-screen md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between max-md:flex-col gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
              <p className="text-muted-foreground">{t('description')}</p>
            </div>
          </div>
          <div id="tour-sidebar-wallet">
            <WalletButton />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <VaultOverviewCard />
          </div>
          <div className="lg:col-span-1 flex">
            <div className="w-full h-full">
              <RiskChart score={45} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <RewardSummary />
          <PerformanceAttribution />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/vault"
            className="flex items-center gap-4 rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
          >
            <ArrowUpFromLine className="h-8 w-8 text-primary" />
            <div>
              <h2 className="font-semibold text-foreground">{t('depositFunds.title')}</h2>
              <p className="text-sm text-muted-foreground">{t('depositFunds.description')}</p>
            </div>
          </Link>

          <Link
            href="/vault"
            className="flex items-center gap-4 rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
          >
            <ArrowDownToLine className="h-8 w-8 text-primary" />
            <div>
              <h2 className="font-semibold text-foreground">{t('withdrawFunds.title')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('withdrawFunds.description')}
              </p>
            </div>
          </Link>
        </div>

        <TransactionList />

        <AiInsightStream />
      </div >
    </div >
  );
}
