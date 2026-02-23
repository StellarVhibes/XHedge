"use client";

import { useState, useCallback } from "react";
import { ArrowUpFromLine, ArrowDownToLine, Loader2 } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { buildDepositXdr, simulateAndAssembleTransaction, submitTransaction, fetchVaultData, VaultMetrics } from "@/lib/stellar";
import { getNetworkPassphrase, NetworkType } from "@/lib/network";

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

type TabType = "deposit" | "withdraw";

export default function VaultPage() {
  const { connected, address, network, signTransaction } = useWallet();
  const [activeTab, setActiveTab] = useState<TabType>("deposit");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });
  const [metrics, setMetrics] = useState<VaultMetrics | null>(null);

  const networkType = (network as NetworkType) || "testnet";

  const loadMetrics = useCallback(async () => {
    if (!connected || !address) return;
    
    try {
      const data = await fetchVaultData(
        CONTRACT_ID,
        address,
        networkType === "mainnet" ? "PUBLIC" : "TESTNET"
      );
      setMetrics(data);
    } catch (error) {
      console.error("Failed to load metrics:", error);
    }
  }, [connected, address, networkType]);

  const handleDeposit = useCallback(async () => {
    if (!connected || !address || !amount || parseFloat(amount) <= 0) {
      setStatus({ type: "error", message: "Please enter a valid amount" });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: "" });

    try {
      const passphrase = getNetworkPassphrase(networkType);
      
      const xdr = await buildDepositXDR(
        CONTRACT_ID,
        address,
        amount,
        networkType
      );
      
      const { result: assembledXdr, error: assembleError } = await simulateAndAssembleTransaction(
        xdr,
        networkType
      );
      
      if (assembleError || !assembledXdr) {
        throw new Error(assembleError || "Failed to assemble transaction");
      }
      
      const { signedTxXdr, error: signError } = await signTransaction(assembledXdr, passphrase);
      
      if (signError || !signedTxXdr) {
        throw new Error(signError || "Failed to sign transaction");
      }
      
      const { hash, error: submitError } = await submitTransaction(signedTxXdr, networkType);
      
      if (submitError || !hash) {
        throw new Error(submitError || "Failed to submit transaction");
      }
      
      setStatus({ type: "success", message: `Deposit successful! Transaction: ${hash.slice(0, 8)}...` });
      setAmount("");
      await loadMetrics();
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Deposit failed",
      });
    } finally {
      setLoading(false);
    }
  }, [connected, address, amount, networkType, signTransaction, loadMetrics]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Vault</h1>

      <div className="rounded-lg border bg-card">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-colors ${
              activeTab === "deposit"
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            Deposit
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-colors ${
              activeTab === "withdraw"
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            Withdraw
          </button>
        </div>

        <div className="p-6">
          {!connected ? (
            <div className="text-center py-8 text-muted-foreground">
              Connect your wallet to deposit or withdraw funds
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  min="0"
                  step="0.01"
                />
              </div>

              {activeTab === "deposit" && (
                <button
                  onClick={handleDeposit}
                  disabled={loading || !amount}
                  className="w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Processing..." : "Deposit"}
                </button>
              )}

              {activeTab === "withdraw" && (
                <button
                  disabled
                  className="w-full py-3 px-4 rounded-lg bg-muted text-muted-foreground font-medium cursor-not-allowed"
                >
                  Withdraw (Coming Soon)
                </button>
              )}

              {status.type && (
                <div
                  className={`p-4 rounded-lg ${
                    status.type === "success"
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {status.message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function buildDepositXDR(
  contractId: string,
  userAddress: string,
  amount: string,
  network: NetworkType
): Promise<string> {
  return buildDepositXdr(contractId, userAddress, amount, network);
}
