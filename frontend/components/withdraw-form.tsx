"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/hooks/use-wallet";
import { 
  buildWithdrawXDR, 
  getVaultInfo, 
  validateWithdrawAmount,
  VaultInfo 
} from "@/lib/stellar";
import { AlertCircle, Loader2, Wallet, ArrowDownToLine } from "lucide-react";

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export function WithdrawForm() {
  const { connected, address, network, loading: walletLoading, signTransaction } = useWallet();
  const [amount, setAmount] = useState("");
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (connected && address && network) {
      getVaultInfo(CONTRACT_ID, address, network as "PUBLIC" | "TESTNET")
        .then(setVaultInfo)
        .catch(() => setVaultInfo(null));
    }
  }, [connected, address, network]);

  const handleMaxClick = () => {
    if (vaultInfo?.userBalance) {
      const maxAmount = Number(BigInt(vaultInfo.userBalance) / BigInt(1e7)) / 1e7;
      setAmount(maxAmount.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!connected || !address || !network) {
      setError("Please connect your wallet first");
      return;
    }

    if (!vaultInfo) {
      setError("Unable to fetch vault information");
      return;
    }

    const validation = validateWithdrawAmount(amount, vaultInfo.userBalance);
    if (!validation.valid) {
      setError(validation.error || "Invalid amount");
      return;
    }

    setLoading(true);

    try {
      const { xdr, error: buildError } = await buildWithdrawXDR({
        userAddress: address,
        contractId: CONTRACT_ID,
        amount,
        network: network as "PUBLIC" | "TESTNET",
      });

      if (buildError || !xdr) {
        setError(buildError || "Failed to build transaction");
        setLoading(false);
        return;
      }

      const networkPassphrase = network === "PUBLIC" 
        ? "Public Global Stellar Network ; September 2015"
        : "Test SDF Network ; September 2015";

      const { signedTxXdr, error: signError } = await signTransaction(xdr, networkPassphrase);

      if (signError || !signedTxXdr) {
        setError(signError || "Failed to sign transaction");
        setLoading(false);
        return;
      }

      setSuccess("Transaction signed successfully! Transaction XDR: " + signedTxXdr.substring(0, 20) + "...");
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2">Checking wallet connection...</span>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <Wallet className="w-5 h-5" />
          <span className="font-medium">Wallet Not Connected</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Please connect your Freighter wallet to withdraw funds.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-medium text-foreground">
          Amount to Withdraw
        </label>
        <div className="relative">
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.0000001"
            min="0"
            className={cn(
              "w-full rounded-lg border bg-background px-4 py-3 text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              error ? "border-destructive" : "border-input"
            )}
          />
          <button
            type="button"
            onClick={handleMaxClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-primary hover:text-primary/80"
          >
            MAX
          </button>
        </div>
        {vaultInfo && (
          <p className="text-sm text-muted-foreground">
            Available: {(Number(BigInt(vaultInfo.userBalance) / BigInt(1e7)) / 1e7).toFixed(7)} shares
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-green-600 dark:text-green-400">
          <span className="text-sm">{success}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !amount}
        className={cn(
          "w-full rounded-lg px-4 py-3 font-medium transition-colors",
          "flex items-center justify-center gap-2",
          loading || !amount
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <ArrowDownToLine className="w-4 h-4" />
            Withdraw
          </>
        )}
      </button>

      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="text-sm font-medium mb-2">Transaction Details</h4>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Network: {network || "Not connected"}</p>
          <p>Contract: {CONTRACT_ID.substring(0, 10)}...{CONTRACT_ID.substring(CONTRACT_ID.length - 6)}</p>
          {address && (
            <p>Wallet: {address.substring(0, 10)}...{address.substring(address.length - 6)}</p>
          )}
        </div>
      </div>
    </form>
  );
}
