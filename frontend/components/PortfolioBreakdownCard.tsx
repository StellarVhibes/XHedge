"use client";

import { useEffect, useState, useMemo } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/app/context/NetworkContext";
import { useRealtimeVault } from "@/hooks/use-realtime-vault";
import { useCurrency } from "@/app/context/CurrencyContext";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, PieChart, Activity } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { fetchUserBasis } from "@/lib/stellar";
import { getVolatilityShieldAddress } from "@/lib/contracts.config";

/**
 * PortfolioBreakdownCard
 * 
 * Displays user-specific vault statistics including shares held,
 * vault percentage ownership, unrealized P&L, and current value.
 */
export function PortfolioBreakdownCard() {
  const { address, connected } = useWallet();
  const { network } = useNetwork();
  const { metrics } = useRealtimeVault(address);
  const { format } = useCurrency();
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [loadingBasis, setLoadingBasis] = useState(false);

  // Calculate weighted entry basis from on-chain events
  useEffect(() => {
    async function loadBasis() {
      if (address && connected && network) {
        setLoadingBasis(true);
        try {
          const contractId = getVolatilityShieldAddress(network);
          const basis = await fetchUserBasis(contractId, address, network);
          if (basis.totalSharesMinted > 0) {
            setEntryPrice(basis.averageEntryPrice);
          }
        } catch (err) {
          console.error("Failed to load user basis:", err);
        } finally {
          setLoadingBasis(false);
        }
      }
    }
    loadBasis();
  }, [address, connected, network]);

  const stats = useMemo(() => {
    if (!metrics || !connected) return null;

    const userShares = parseFloat(metrics.userShares) / 1e7;
    const totalShares = parseFloat(metrics.totalShares) / 1e7;
    const currentSharePrice = parseFloat(metrics.sharePrice);
    
    // sharePercentage: (userShares / totalShares) * 100
    const sharePercentage = totalShares > 0 ? (userShares / totalShares) * 100 : 0;
    
    // Current value of portfolio in assets
    const currentValue = userShares * currentSharePrice;
    
    let unrealizedPnL = 0;
    let unrealizedPnLPercentage = 0;
    
    // P&L calculation based on entry share price
    // If entryPrice isn't available yet, P&L is 0
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

  if (!connected || !stats || stats.userShares <= 0) {
    return null;
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

        {/* Unrealized P&L */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Activity className="w-3 h-3" /> P&L (Unrealized)
          </p>
          <p className={`text-2xl font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>
            {isPositive ? "+" : ""}{format(stats.unrealizedPnL)}
          </p>
          <p className={`text-xs font-medium ${isPositive ? "text-green-500" : "text-red-500"} flex items-center gap-1`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? "+" : ""}{stats.unrealizedPnLPercentage.toFixed(2)}%
          </p>
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
