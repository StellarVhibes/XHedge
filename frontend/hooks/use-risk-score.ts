"use client";

import { useState, useEffect, useMemo } from "react";
import { useVault } from "@/app/context/VaultContext";
import { useNetwork } from "@/app/context/NetworkContext";
import { fetchVaultData, VaultMetrics } from "@/lib/stellar";

interface StrategyHealth {
  address: string;
  is_healthy: boolean;
  last_known_balance: string;
  consecutive_failures: number;
}

interface VaultRiskData {
  utilizationRate: number;
  unhealthyStrategies: number;
  totalStrategies: number;
  volatilityIndex: number;
  sharePriceStability: number;
}

/**
 * Computes a risk score (0-100) based on vault metrics and strategy health.
 * 
 * Risk Score Formula:
 * - Base score: 50 (neutral)
 * - Utilization Rate Impact: +/- 15 points (0-100% utilization)
 * - Strategy Health Impact: +/- 20 points (unhealthy strategies)
 * - Volatility Impact: +/- 10 points (market volatility)
 * - Share Price Stability: +/- 5 points (price fluctuations)
 * 
 * Higher scores indicate higher risk.
 */
export function useRiskScore() {
  const { optimisticBalance, optimisticShares } = useVault();
  const { network } = useNetwork();
  const [metrics, setMetrics] = useState<VaultMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vault metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        // In a real implementation, we'd fetch strategy health data from an API
        // For now, we'll simulate with mock data
        const mockRiskData: VaultRiskData = {
          utilizationRate: optimisticBalance > 0 ? Math.min((optimisticBalance / 1000000) * 100, 100) : 0,
          unhealthyStrategies: 0, // Would come from strategy health API
          totalStrategies: 3, // Would come from strategy registry
          volatilityIndex: 25, // Would come from volatility oracle
          sharePriceStability: 10, // Would come from price history analysis
        };

        // Create mock metrics for demonstration
        const mockMetrics: VaultMetrics = {
          totalAssets: (optimisticBalance * 1e7).toString(),
          totalShares: (optimisticShares * 1e7).toString(),
          sharePrice: optimisticShares > 0 ? (optimisticBalance / optimisticShares).toString() : "1",
          userBalance: (optimisticBalance * 1e7).toString(),
          userShares: (optimisticShares * 1e7).toString(),
          assetSymbol: "XLM",
        };

        setMetrics(mockMetrics);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch risk data");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [optimisticBalance, optimisticShares, network]);

  const riskScore = useMemo(() => {
    if (!metrics) return null;

    // Base score starts at 50 (neutral risk)
    let score = 50;

    // 1. Utilization Rate Impact (0-100% -> +/- 15 points)
    const utilizationRate = optimisticBalance > 0 ? Math.min((optimisticBalance / 1000000) * 100, 100) : 0;
    if (utilizationRate > 80) {
      score += 15; // High utilization increases risk
    } else if (utilizationRate > 60) {
      score += 8;
    } else if (utilizationRate < 20) {
      score -= 5; // Very low utilization might indicate lack of confidence
    }

    // 2. Strategy Health Impact (+/- 20 points)
    // For demo, we'll simulate some strategy health issues
    const unhealthyStrategies = 0; // Would come from API
    const totalStrategies = 3;
    const healthRatio = totalStrategies > 0 ? (totalStrategies - unhealthyStrategies) / totalStrategies : 1;
    
    if (healthRatio < 0.5) {
      score += 20; // Many unhealthy strategies = high risk
    } else if (healthRatio < 0.8) {
      score += 10;
    } else if (healthRatio === 1) {
      score -= 5; // All healthy = lower risk
    }

    // 3. Volatility Impact (+/- 10 points)
    const volatilityIndex = 25; // Would come from oracle (0-100)
    if (volatilityIndex > 70) {
      score += 10;
    } else if (volatilityIndex > 50) {
      score += 5;
    } else if (volatilityIndex < 20) {
      score -= 5;
    }

    // 4. Share Price Stability (+/- 5 points)
    const sharePriceStability = 10; // Would come from price analysis (0-100, higher = more stable)
    if (sharePriceStability < 30) {
      score += 5;
    } else if (sharePriceStability > 80) {
      score -= 5;
    }

    // Ensure score stays within 0-100 bounds
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [metrics, optimisticBalance, optimisticShares]);

  return {
    score: riskScore,
    loading,
    error,
    metrics,
  };
}
