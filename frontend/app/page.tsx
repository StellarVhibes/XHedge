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
import { PortfolioBreakdownCard } from "@/components/PortfolioBreakdownCard";
import AllocationChart, { Slice } from "@/components/AllocationChart";
import StrategyDetailModal, { StrategyDetail } from "@/components/StrategyDetailModal";
import { RiskChart } from "@/components/RiskChart";
import { useWallet } from "@/hooks/use-wallet";
import { useRiskScore } from "@/hooks/use-risk-score";

import { useTranslations } from "@/lib/i18n-context";

export default function Home() {
  const t = useTranslations("Home");
  const commonT = useTranslations("Common");
  const [slices, setSlices] = useState<Slice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyDetail | null>(null);
  const { address } = useWallet();
  const { score: riskScore, loading: riskLoading } = useRiskScore();

  const canFlagStrategy = (() => {
    if (!address) return false;
    const raw = process.env.NEXT_PUBLIC_STRATEGY_GUARDIAN_ADDRESSES ?? "";
    const allow = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return allow.includes(address);
  })();

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

  const openStrategyModal = async (slice: Slice) => {
    try {
      const encoded = encodeURIComponent(slice.name);
      const response = await fetch(`/api/strategy/${encoded}`);
      if (!response.ok) {
        throw new Error("Failed to load strategy detail");
      }

      const detail = (await response.json()) as StrategyDetail;
      setSelectedStrategy(detail);
      setModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

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
              {riskLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">Loading risk score...</div>
                </div>
              ) : (
                <RiskChart score={riskScore ?? 45} />
              )}
            </div>
          </div>
        </div>

        <PortfolioBreakdownCard />

        <div className="grid gap-4 md:grid-cols-2">
          <RewardSummary />
          <PerformanceAttribution />
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">Strategy Allocation</h2>
            <p className="text-sm text-muted-foreground">
              Click a strategy slice to inspect health, balances, and allocation drift.
            </p>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground" aria-live="polite" aria-busy="true">Loading allocation data...</p>
          ) : error ? (
            <p className="text-sm text-destructive" aria-live="assertive" role="alert">{error}</p>
          ) : slices && slices.length > 0 ? (
            <AllocationChart slices={slices} onSliceClick={openStrategyModal} />
          ) : (
            <p className="text-sm text-muted-foreground">{t('noAllocationData')}</p>
          )}
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

      <StrategyDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        detail={selectedStrategy}
        canFlag={canFlagStrategy}
        onFlagStrategy={(strategyAddress) => {
          // TODO: wire to backend guardian endpoint when available.
          setError(`Flag request queued for ${strategyAddress.slice(0, 8)}...`);
        }}
      />
    </div >
  );
}
