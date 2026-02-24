"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, TrendingUp, TrendingDown, RefreshCw, Wallet } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/app/context/NetworkContext";
import { useCurrency } from "@/app/context/CurrencyContext";
import { fetchVaultData, VaultMetrics } from "@/lib/stellar";
import { formatNumber } from "@/lib/utils";

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export function VaultOverviewCard() {
  const { connected, address } = useWallet();
  const { network } = useNetwork();
  const { format } = useCurrency();
  const [metrics, setMetrics] = useState<VaultMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVaultData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const data = await fetchVaultData(
        CONTRACT_ID,
        address,
        network
      );
      setMetrics(data);
    } catch (error) {
      console.error("Failed to fetch vault data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [address, network]);

  useEffect(() => {
    loadVaultData();
  }, [loadVaultData]);

  const handleRefresh = () => {
    loadVaultData(true);
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading vault data...</span>
        </div>
      </div>
    );
  }

  const totalAssets = parseFloat(metrics?.totalAssets || "0") / 1e7;
  const totalShares = parseFloat(metrics?.totalShares || "0") / 1e7;
  const sharePrice = parseFloat(metrics?.sharePrice || "1.0000000");
  const userBalance = parseFloat(metrics?.userBalance || "0") / 1e7;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Vault Overview</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Assets"
          value={format(totalAssets)}
          subtitle={metrics?.assetSymbol || "USDC"}
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
        />
        
        <MetricCard
          title="Total Shares"
          value={formatNumber(totalShares)}
          subtitle="XHS"
          icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
        />
        
        <MetricCard
          title="Share Price"
          value={format(sharePrice)}
          subtitle={`${metrics?.assetSymbol || "USDC"} per share`}
          icon={<TrendingUp className="w-4 h-4 text-primary" />}
          highlight
        />
        
        <MetricCard
          title="Your Balance"
          value={connected ? format(userBalance) : "—"}
          subtitle={connected ? `${metrics?.assetSymbol || "USDC"}` : "Connect wallet"}
          icon={<Wallet className="w-4 h-4 text-muted-foreground" />}
        />
      </div>

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
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

function MetricCard({ title, value, subtitle, icon, highlight }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{title}</span>
      </div>
      <div className={`text-2xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </div>
  );
}
