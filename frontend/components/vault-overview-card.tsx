"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, TrendingUp, RefreshCw, Wallet, Clock } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { useCurrency } from "@/app/context/CurrencyContext";
import { MetricTooltip } from "@/components/MetricTooltip";
import { formatNumber } from "@/lib/utils";
import { useVault } from "@/app/context/VaultContext";
import { useStaleData } from "@/hooks/use-stale-data";
import { StaleBadge } from "@/components/StaleBadge";
import { VaultOverviewSkeleton } from "@/components/ui/skeleton";
import { useRealtimeVault } from "@/hooks/use-realtime-vault";
import { ConnectionStatusIndicator } from "@/components/ConnectionStatusIndicator";
import type { VaultMetrics } from "@/lib/stellar";

export function VaultOverviewCard() {
  const { connected, address } = useWallet();
  const { format } = useCurrency();
  const { state, setLoading } = useStaleData<VaultMetrics>(5 * 60 * 1000);
  const [refreshing, setRefreshing] = useState(false);

  const { optimisticBalance, optimisticShares, hasPending, updateMetrics } = useVault();

  const { status, reconnectAttempts, refresh: realtimeRefresh } = useRealtimeVault(address);

  useEffect(() => {
    if (state.data) {
      updateMetrics(state.data.userBalance || "0", state.data.userShares || "0");
    }
  }, [state.data, updateMetrics]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    realtimeRefresh();
    setRefreshing(false);
  }, [realtimeRefresh]);

  if (state.loading) {
    return <VaultOverviewSkeleton />;
  }

  const metrics = state.data;
  const totalAssets = parseFloat(metrics?.totalAssets || "0") / 1e7;
  const totalShares = parseFloat(metrics?.totalShares || "0") / 1e7;
  const sharePrice = parseFloat(metrics?.sharePrice || "1.0000000");
  const userBalance = optimisticBalance;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Vault Overview</h2>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatusIndicator status={status} reconnectAttempts={reconnectAttempts} />
          <StaleBadge
            lastFetchedAt={state.lastFetchedAt}
            isStale={state.isStale}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Assets"
          tooltip="The total value of all assets currently deposited and managed by this vault."
          value={format(totalAssets)}
          subtitle={metrics?.assetSymbol || "USDC"}
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
        />
        <MetricCard
          title="Total Shares"
          tooltip="The total number of vault shares (XHS) issued to all depositors. Each share represents a proportional claim on vault assets."
          value={formatNumber(totalShares)}
          subtitle="XHS"
          icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
          pending={hasPending}
        />
        <MetricCard
          title="Share Price"
          tooltip="The current value of one vault share in the deposit asset. Share price rises as the vault earns yield."
          value={format(sharePrice)}
          subtitle={`${metrics?.assetSymbol || "USDC"} per share`}
          icon={<TrendingUp className="w-4 h-4 text-primary" />}
          highlight
        />
        <MetricCard
          title="Your Balance"
          tooltip="Your current estimated asset value in the vault, based on your shares multiplied by the current share price."
          value={connected ? format(userBalance) : "—"}
          subtitle={connected ? `${metrics?.assetSymbol || "USDC"}` : "Connect wallet"}
          icon={<Wallet className="w-4 h-4 text-muted-foreground" />}
          pending={hasPending}
        />
      </div>

      {state.error && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {state.error} — showing last known data.
        </div>
      )}

      {status === "disconnected" && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm flex items-center gap-2">
          <span>Real-time connection lost. Data may be outdated.</span>
          <button onClick={handleRefresh} className="underline text-red-400 hover:text-red-300 transition-colors">
            Retry
          </button>
        </div>
      )}

      {!connected && (
        <div className="mt-4 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          Connect your Freighter wallet to see your personal vault statistics.
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  tooltip: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  highlight?: boolean;
  pending?: boolean;
}

function MetricCard({ title, tooltip, value, subtitle, icon, highlight, pending }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-muted/50 relative overflow-hidden">
      {pending && <div className="absolute inset-x-0 bottom-0 h-1 bg-yellow-500/30 animate-pulse" />}
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <MetricTooltip label={title} tip={tooltip} className="text-sm" />
        {pending && <Clock className="w-3 h-3 text-yellow-600 animate-pulse" />}
      </div>
      <div className={`text-2xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
        {pending && <span className="text-xs text-yellow-600 ml-1 font-normal">*</span>}
      </div>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </div>
  );
}
