"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/app/context/NetworkContext";
import { useRealtimeVault } from "@/hooks/use-realtime-vault";
import { useCurrency } from "@/app/context/CurrencyContext";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, PieChart, Activity, AlertCircle, RefreshCw } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { fetchUserBasis } from "@/lib/stellar";
import { getVolatilityShieldAddress } from "@/lib/contracts.config";

/**
 * PortfolioBreakdownCard
 *
 * Displays user-specific vault statistics including shares held,
 * vault percentage ownership, unrealized P&L, and current value.
 *
 * Changes:
 *  - #428: shows a skeleton placeholder during loading to prevent CLS
 *  - #427: shows an error state with retry button when basis fetch fails
 */

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PortfolioBreakdownCardSkeleton() {
  return (
    <Card className="p-6 shadow-sm border bg-card" data-testid="portfolio-skeleton">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-6 h-6 rounded bg-muted animate-pulse" />
        <div className="h-5 w-48 rounded bg-muted animate-pulse" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-8 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="h-3 w-28 rounded bg-muted animate-pulse" />
          <div className="h-5 w-20 rounded bg-muted animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-28 rounded bg-muted animate-pulse" />
          <div className="h-5 w-20 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PortfolioBreakdownCard() {
  const { address, connected } = useWallet();
  const { network } = useNetwork();
  const { metrics } = useRealtimeVault(address);
  const { format } = useCurrency();
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [loadingBasis, setLoadingBasis] = useState(false);
  // #427 — error state for failed basis fetch
  const [basisError, setBasisError] = useState(false);
  // #428 — first-load flag to show skeleton while data is being fetched
  const [initialLoad, setInitialLoad] = useState(true);

  const loadBasis = useCallback(async () => {
    if (!address || !connected || !network) return;
    setLoadingBasis(true);
    setBasisError(false);
    try {
      const contractId = getVolatilityShieldAddress(network);
      const basis = await fetchUserBasis(contractId, address, network);
      if (basis.totalSharesMinted > 0) {
        setEntryPrice(basis.averageEntryPrice);
      }
    } catch (err) {
      console.error("Failed to load user basis:", err);
      // #427 — surface the error rather than silently showing 0
      setBasisError(true);
    } finally {
      setLoadingBasis(false);
      setInitialLoad(false);
    }
  }, [address, connected, network]);

  useEffect(() => {
    loadBasis();
  }, [loadBasis]);

  const stats = useMemo(() => {
    if (!metrics || !connected) return null;

    const userShares = parseFloat(metrics.userShares) / 1e7;
    const totalShares = parseFloat(metrics.totalShares) / 1e7;
    const currentSharePrice = parseFloat(metrics.sharePrice);

    const sharePercentage = totalShares > 0 ? (userShares / totalShares) * 100 : 0;
    const currentValue = userShares * currentSharePrice;

    let unrealizedPnL = 0;
    let unrealizedPnLPercentage = 0;

    if (entryPrice && entryPrice > 0) {
      unrealizedPnL = (currentSharePrice - entryPrice) * userShares;
      unrealizedPnLPercentage = ((currentSharePrice - entryPrice) / entryPrice) * 100;
    }

    return {
      userShares,
      sharePercentage,
      entryPrice: entryPrice || currentSharePrice,
      currentSharePrice,
      currentValue,
      unrealizedPnL,
      unrealizedPnLPercentage,
    };
  }, [metrics, connected, entryPrice]);

  // Not connected or no shares → don't render anything
  if (!connected || !stats || stats.userShares <= 0) {
    return null;
  }

  // #428 — show skeleton during the initial basis fetch to prevent CLS
  if (initialLoad || loadingBasis) {
    return <PortfolioBreakdownCardSkeleton />;
  }

  const isPositive = stats.unrealizedPnL >= 0;

  return (
    <Card className="p-6 shadow-sm border bg-card">
      <div className="flex items-center gap-3 mb-6">
        <PieChart className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold">Your Portfolio Breakdown</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Shares and Vault % */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Wallet className="w-3 h-3" /> Shares Held
          </p>
          <p className="text-2xl font-bold">{formatNumber(stats.userShares)} XHS</p>
          <p className="text-xs text-muted-foreground">
            {stats.sharePercentage < 0.0001 && stats.sharePercentage > 0
              ? "< 0.0001"
              : stats.sharePercentage.toFixed(4)}% of vault
          </p>
        </div>

        {/* Unrealized P&L — #427: show error state instead of silent 0 */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Activity className="w-3 h-3" /> P&L (Unrealized)
          </p>
          {basisError ? (
            <div data-testid="basis-error-state">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-destructive" />
                P&L data unavailable
              </p>
              <button
                data-testid="basis-retry-button"
                onClick={loadBasis}
                className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          ) : (
            <>
              <p className={`text-2xl font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                {isPositive ? "+" : ""}{format(stats.unrealizedPnL)}
              </p>
              <p className={`text-xs font-medium ${isPositive ? "text-green-500" : "text-red-500"} flex items-center gap-1`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? "+" : ""}{stats.unrealizedPnLPercentage.toFixed(2)}%
              </p>
            </>
          )}
        </div>

        {/* Current Estimated Value */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            Estimated USD Value
          </p>
          <p className="text-2xl font-bold text-primary">{format(stats.currentValue)}</p>
          <p className="text-xs text-muted-foreground">at {format(stats.currentSharePrice)} / share</p>
        </div>
      </div>

      {/* Entry and Current price details */}
      <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Entry Share Price</p>
          <p className="font-medium">{format(stats.entryPrice)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Current Share Price</p>
          <p className="font-medium">{format(stats.currentSharePrice)}</p>
        </div>
      </div>
    </Card>
  );
}
