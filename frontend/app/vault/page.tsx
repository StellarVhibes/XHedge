"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowUpFromLine, ArrowDownToLine, Loader2 } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork, NetworkType } from "@/app/context/NetworkContext";
import { buildDepositXdr, buildWithdrawXdr, simulateAndAssembleTransaction, submitTransaction, fetchVaultData, VaultMetrics, getNetworkPassphrase, estimateTransactionFee } from "@/lib/stellar";
import VaultAPYChart from "@/components/VaultAPYChart";
import TimeframeFilter, { Timeframe } from "@/components/TimeframeFilter";
import { generateMockData, DataPoint } from "@/lib/chart-data";

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

type TabType = "deposit" | "withdraw";

export default function VaultPage() {
  const { connected, address, signTransaction } = useWallet();
  const { network } = useNetwork();
  const [activeTab, setActiveTab] = useState<TabType>("deposit");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [estimatingFee, setEstimatingFee] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });
  const [metrics, setMetrics] = useState<VaultMetrics | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1M');
  const [chartData, setChartData] = useState<DataPoint[]>([]);

  // Load initial chart data
  useEffect(() => {
    setChartData(generateMockData(selectedTimeframe));
  }, []);

  // Handle timeframe changes with loading state
  const handleTimeframeChange = async (timeframe: Timeframe) => {
    setChartLoading(true);
    setSelectedTimeframe(timeframe);

    // Simulate API call delay for smooth transitions
    await new Promise(resolve => setTimeout(resolve, 500));

    setChartData(generateMockData(timeframe));
    setChartLoading(false);
  };

  // Load vault data
  useEffect(() => {
    if (connected && network) {
      loadVaultData();
    }
  }, [connected, network]);

  const loadVaultData = async () => {
    try {
      setLoading(true);
      const data = await fetchVaultData(
        CONTRACT_ID,
        address,
        network
      );
      setMetrics(data);
      setStatus({ type: null, message: "" });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load vault data",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchFee = async () => {
      if (!connected || !address || !amount || parseFloat(amount) <= 0) {
        setEstimatedFee(null);
        return;
      }

      setEstimatingFee(true);
      try {
        let xdr;
        if (activeTab === "deposit") {
          xdr = await buildDepositXdr(CONTRACT_ID, address, amount, network);
        } else {
          xdr = await buildWithdrawXdr(CONTRACT_ID, address, amount, network);
        }

        const { fee, error } = await estimateTransactionFee(xdr, network);
        if (!error && fee) {
          const feeXlm = (Number(fee) / 1e7).toFixed(5);
          setEstimatedFee(feeXlm);
        } else {
          setEstimatedFee(null);
        }
      } catch (e) {
        setEstimatedFee(null);
      } finally {
        setEstimatingFee(false);
      }
    };

    const timeoutId = setTimeout(fetchFee, 500);
    return () => clearTimeout(timeoutId);
  }, [amount, activeTab, connected, address, network]);

  const userBalance = metrics ? parseFloat(metrics.userBalance) / 1e7 : 0;
  const userShares = metrics ? parseFloat(metrics.userShares) / 1e7 : 0;

  const handleDeposit = useCallback(async () => {
    if (!connected || !address || !amount || parseFloat(amount) <= 0) {
      setStatus({ type: "error", message: "Please enter a valid amount" });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: "" });

    try {
      const passphrase = getNetworkPassphrase(network);

      const xdr = await buildDepositXdr(
        CONTRACT_ID,
        address,
        amount,
        network
      );

      const { result: assembledXdr, error: assembleError } = await simulateAndAssembleTransaction(
        xdr,
        network
      );

      if (assembleError || !assembledXdr) {
        throw new Error(assembleError || "Failed to assemble transaction");
      }

      const { signedTxXdr, error: signError } = await signTransaction(assembledXdr, passphrase);

      if (signError || !signedTxXdr) {
        throw new Error(signError || "Failed to sign transaction");
      }

      const { hash, error: submitError } = await submitTransaction(signedTxXdr, network);

      if (submitError || !hash) {
        throw new Error(submitError || "Failed to submit transaction");
      }

      setStatus({ type: "success", message: `Deposit successful! Transaction: ${hash.slice(0, 8)}...` });
      setAmount("");
      await loadVaultData();
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Deposit failed",
      });
    } finally {
      setLoading(false);
    }
  }, [connected, address, amount, network, signTransaction, loadVaultData]);

  const handleWithdraw = useCallback(async () => {
    if (!connected || !address || !amount || parseFloat(amount) <= 0) {
      setStatus({ type: "error", message: "Please enter a valid amount" });
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount > userShares) {
      setStatus({ type: "error", message: `Insufficient balance. You have ${userShares.toFixed(2)} shares.` });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: "" });

    try {
      const passphrase = getNetworkPassphrase(network);

      const xdr = await buildWithdrawXdr(
        CONTRACT_ID,
        address,
        amount,
        network
      );

      const { result: assembledXdr, error: assembleError } = await simulateAndAssembleTransaction(
        xdr,
        network
      );

      if (assembleError || !assembledXdr) {
        throw new Error(assembleError || "Failed to assemble transaction");
      }

      const { signedTxXdr, error: signError } = await signTransaction(assembledXdr, passphrase);

      if (signError || !signedTxXdr) {
        throw new Error(signError || "Failed to sign transaction");
      }

      const { hash, error: submitError } = await submitTransaction(signedTxXdr, network);

      if (submitError || !hash) {
        throw new Error(submitError || "Failed to submit transaction");
      }

      setStatus({ type: "success", message: `Withdraw successful! Transaction: ${hash.slice(0, 8)}...` });
      setAmount("");
      await loadVaultData();
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Withdraw failed",
      });
    } finally {
      setLoading(false);
    }
  }, [connected, address, amount, userShares, network, signTransaction, loadVaultData]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Vault</h1>

      <div className="rounded-lg border bg-card">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-colors ${activeTab === "deposit"
              ? "bg-primary/10 text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            Deposit
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-colors ${activeTab === "withdraw"
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
              {activeTab === "withdraw" && (
                <div className="text-sm text-muted-foreground mb-2">
                  Available: {userShares.toFixed(2)} XHS
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  {activeTab === "deposit" ? "Amount (USDC)" : "Amount (XHS)"}
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
                {(estimatingFee || estimatedFee) && amount && parseFloat(amount) > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground flex items-center justify-between">
                    <span>Estimated Network Fee:</span>
                    <span>
                      {estimatingFee ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Calculating...
                        </span>
                      ) : (
                        `~${estimatedFee} XLM`
                      )}
                    </span>
                  </div>
                )}
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
                  onClick={handleWithdraw}
                  disabled={loading || !amount || userShares <= 0}
                  className="w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Processing..." : "Withdraw"}
                </button>
              )}

              {status.type && (
                <div
                  className={`p-4 rounded-lg ${status.type === "success"
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

      {connected && (
        <div className="mt-8 rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">APY History</h2>
            <TimeframeFilter
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={handleTimeframeChange}
              loading={chartLoading}
            />
          </div>
          <VaultAPYChart data={chartData} loading={chartLoading} />
        </div>
      )}
    </div>
  );
}
