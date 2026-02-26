"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowUpFromLine, ArrowDownToLine, Loader2, FileText, Shield } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork, NetworkType } from "@/app/context/NetworkContext";
import { buildDepositXdr, buildWithdrawXdr, simulateAndAssembleTransaction, submitTransaction, fetchVaultData, VaultMetrics, getNetworkPassphrase } from "@/lib/stellar";
import VaultAPYChart from "@/components/VaultAPYChart";
import TimeframeFilter, { Timeframe } from "@/components/TimeframeFilter";
import { generateMockData, DataPoint } from "@/lib/chart-data";
import TermsModal from "@/components/TermsModal";
import PrivacyModal from "@/components/PrivacyModal";
import { Modal } from "@/components/ui/modal";

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

type TabType = "deposit" | "withdraw";

export default function VaultPage() {
  const { connected, address, signTransaction } = useWallet();
  const { network } = useNetwork();
  const [activeTab, setActiveTab] = useState<TabType>("deposit");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });
  const [metrics, setMetrics] = useState<VaultMetrics | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1M');
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  
  // Legal acceptance state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showLegalWarning, setShowLegalWarning] = useState(false);

  // Check for existing legal acceptance on mount
  useEffect(() => {
    const savedTerms = localStorage.getItem('terms_accepted');
    const savedPrivacy = localStorage.getItem('privacy_accepted');
    
    if (savedTerms === 'true') {
      setTermsAccepted(true);
    }
    if (savedPrivacy === 'true') {
      setPrivacyAccepted(true);
    }
  }, []);

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

  const userBalance = metrics ? parseFloat(metrics.userBalance) / 1e7 : 0;
  const userShares = metrics ? parseFloat(metrics.userShares) / 1e7 : 0;

  const handleDeposit = useCallback(async () => {
    if (!connected || !address || !amount || parseFloat(amount) <= 0) {
      setStatus({ type: "error", message: "Please enter a valid amount" });
      return;
    }

    // Check legal acceptance for first-time users
    if (!termsAccepted || !privacyAccepted) {
      setShowLegalWarning(true);
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
  }, [connected, address, amount, network, signTransaction, loadVaultData, termsAccepted, privacyAccepted]);

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

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    localStorage.setItem('terms_accepted', 'true');
    setShowTermsModal(false);
  };

  const handlePrivacyAccept = () => {
    setPrivacyAccepted(true);
    localStorage.setItem('privacy_accepted', 'true');
    setShowPrivacyModal(false);
  };

  const handleLegalAgreement = () => {
    setShowLegalWarning(false);
    if (!termsAccepted) {
      setShowTermsModal(true);
    } else if (!privacyAccepted) {
      setShowPrivacyModal(true);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Vault</h1>

      <div className="rounded-lg border bg-card">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-colors ${
              activeTab === "deposit"
                ? "bg-background text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowUpFromLine className="h-4 w-4" />
            Deposit
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-colors ${
              activeTab === "withdraw"
                ? "bg-background text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDownToLine className="h-4 w-4" />
            Withdraw
          </button>
        </div>

        <div className="p-6">
          {connected && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Your Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userBalance.toFixed(2)} XLM</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Your Shares</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userShares.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Current APY</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics ? (parseFloat(metrics.sharePrice) * 100).toFixed(2) : "0.00"}%
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "deposit" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="deposit-amount" className="block text-sm font-medium mb-2">
                  Deposit Amount
                </label>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="Enter amount to deposit"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!connected || loading}
                />
              </div>

              {/* Legal Acceptance Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Terms of Service:</span>
                    <Badge variant={termsAccepted ? "default" : "secondary"}>
                      {termsAccepted ? "Accepted" : "Not Accepted"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Privacy Policy:</span>
                    <Badge variant={privacyAccepted ? "default" : "secondary"}>
                      {privacyAccepted ? "Accepted" : "Not Accepted"}
                    </Badge>
                  </div>
                </div>
                {(!termsAccepted || !privacyAccepted) && (
                  <p className="text-xs text-muted-foreground">
                    You must accept both the Terms of Service and Privacy Policy before making your first deposit.
                  </p>
                )}
              </div>

              <Button 
                onClick={handleDeposit} 
                disabled={!connected || loading || !amount || parseFloat(amount) <= 0}
                className="w-full"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  "Deposit"
                )}
              </Button>
            </div>
          )}

          {activeTab === "withdraw" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="withdraw-amount" className="block text-sm font-medium mb-2">
                  Withdraw Amount
                </label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="Enter amount to withdraw"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!connected || loading}
                />
              </div>

              <Button 
                onClick={handleWithdraw} 
                disabled={!connected || loading || !amount || parseFloat(amount) <= 0}
                className="w-full"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  "Withdraw"
                )}
              </Button>
            </div>
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

      {/* Legal Modals */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleTermsAccept}
        showAcceptCheckbox={true}
      />

      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={handlePrivacyAccept}
        showAcceptCheckbox={true}
      />

      {/* Legal Warning Modal */}
      {showLegalWarning && (
        <Modal
          isOpen={showLegalWarning}
          onClose={() => setShowLegalWarning(false)}
          title="Legal Agreement Required"
          size="md"
        >
          <div className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Before making your first deposit, you must accept our Terms of Service and Privacy Policy.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="font-medium">Terms of Service</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowLegalWarning(false);
                    setShowTermsModal(true);
                  }}
                >
                  {termsAccepted ? "View" : "Accept"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Privacy Policy</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowLegalWarning(false);
                    setShowPrivacyModal(true);
                  }}
                >
                  {privacyAccepted ? "View" : "Accept"}
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleLegalAgreement}
                disabled={!termsAccepted || !privacyAccepted}
              >
                Continue to Deposit
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
