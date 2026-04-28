"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Loader2 } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';
import { useNetwork } from '@/app/context/NetworkContext';
import { fetchVaultData, VaultMetrics } from '@/lib/stellar';
import { useTranslations } from '@/lib/i18n-context';

interface MaxAmountButtonProps {
  type: 'deposit' | 'withdraw';
  onAmountSet: (amount: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function MaxAmountButton({ 
  type, 
  onAmountSet, 
  disabled = false, 
  className = '' 
}: MaxAmountButtonProps) {
  const t = useTranslations("Vault");
  const { connected, address } = useWallet();
  const { network } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMaxClick = useCallback(async () => {
    if (!connected || !address || disabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const vaultData = await fetchVaultData(network, address);
      
      let maxAmount: number;
      
      if (type === 'deposit') {
        // For deposit, use the user's wallet balance
        maxAmount = vaultData.userBalance;
      } else {
        // For withdraw, use the user's shares converted to assets
        maxAmount = vaultData.userShares * vaultData.sharePrice;
      }

      // Format the amount with appropriate decimal places
      const formattedAmount = maxAmount > 0 
        ? maxAmount.toFixed(6).replace(/\.?0+$/, '') // Remove trailing zeros
        : '0';

      onAmountSet(formattedAmount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(errorMessage);
      console.error('Failed to fetch max amount:', err);
    } finally {
      setLoading(false);
    }
  }, [connected, address, disabled, type, network, onAmountSet]);

  const tooltipText = type === 'deposit' 
    ? t("maxDepositTooltip") 
    : t("maxWithdrawTooltip");

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleMaxClick}
      disabled={!connected || disabled || loading}
      className={`flex items-center gap-1 ${className}`}
      title={tooltipText}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Maximize2 className="h-3 w-3" />
      )}
      {t("max")}
    </Button>
  );
}
