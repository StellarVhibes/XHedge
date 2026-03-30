"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Clock, FileText, Loader2, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import PrivacyModal from "@/components/PrivacyModal";
import SigningOverlay, { SigningStep } from "@/components/SigningOverlay";
import TermsModal from "@/components/TermsModal";
import TimeframeFilter, { Timeframe } from "@/components/TimeframeFilter";
import VaultAPYChart from "@/components/VaultAPYChart";
import { useNetwork } from "@/app/context/NetworkContext";
import { usePrices } from "@/app/context/PriceContext";
import { useVault } from "@/app/context/VaultContext";
import { useWallet } from "@/hooks/use-wallet";
import { fetchApyData, DataPoint } from "@/lib/chart-data";
import { getVolatilityShieldAddress } from "@/lib/contracts.config";
import { useTranslations } from "@/lib/i18n-context";
import {
  buildDepositXdr,
  buildWithdrawXdr,
  convertToAssets,
  convertToShares,
  estimateTransactionFee,
  fetchVaultData,
  getNetworkPassphrase,
  getSharePrice,
  simulateAndAssembleTransaction,
  submitTransaction,
  VaultMetrics,
} from "@/lib/stellar";
type TabType = "deposit" | "withdraw";

interface PreviewState {
  outputValue: number;
  sharePrice: number;
  feeXlm: number;
}

const EMPTY_PREVIEW: PreviewState = {
  outputValue: 0,
  sharePrice: 0,
  feeXlm: 0,
};

export default function VaultPage() {
  const t = useTranslations("Vault");
  const { connected, address, signTransaction } = useWallet();
  const { network } = useNetwork();
  const { prices } = usePrices();  const {
    optimisticBalance,
    optimisticShares,
    hasPending,
    pendingTxs,
    addPendingDeposit,
    addPendingWithdraw,
    confirmTx,
    failTx,
    updateMetrics,
  } = useVault();

  const [activeTab, setActiveTab] = useState<TabType>("deposit");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<VaultMetrics | null>(null);
  const [preview, setPreview] = useState<PreviewState>(EMPTY_PREVIEW);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("1M");
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [signingStep, setSigningStep] = useState<SigningStep>("idle");
  const [signingErrorMessage, setSigningErrorMessage] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showLegalWarning, setShowLegalWarning] = useState(false);

  const contractId = useMemo(() => getVolatilityShieldAddress(network), [network]);

  const loadVaultData = useCallback(async () => {
    if (!connected || !address) {
      setMetrics(null);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchVaultData(contractId, address, network);
      setMetrics(data);
      updateMetrics(data.userBalance, data.userShares);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load vault data");
    } finally {
      setLoading(false);
    }
  }, [connected, address, contractId, network, updateMetrics]);

  const loadChartData = useCallback(
    async (timeframe: Timeframe) => {
      if (!connected) {
        setChartData([]);
        return;
      }

      try {
        setChartLoading(true);
        setChartError(null);
        const data = await fetchApyData(timeframe, contractId, network);
        setChartData(data);
      } catch (error) {
        setChartError(error instanceof Error ? error.message : "Failed to load APY data");
      } finally {
        setChartLoading(false);
      }
    },
    [connected, contractId, network]
  );

  useEffect(() => {
    loadVaultData();
  }, [loadVaultData]);

  useEffect(() => {
    if (!connected) {
      return;
    }

    loadChartData(selectedTimeframe);
  }, [connected, selectedTimeframe, loadChartData]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setTermsAccepted(localStorage.getItem("terms_accepted") === "true");
    setPrivacyAccepted(localStorage.getItem("privacy_accepted") === "true");
  }, []);

  useEffect(() => {
    const parsedAmount = parseFloat(amount || "0");

    if (!connected || !address || !amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setPreview(EMPTY_PREVIEW);
      setPreviewLoading(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const previewPromise =
          activeTab === "deposit"
            ? convertToShares(contractId, address, amount, network)
            : convertToAssets(contractId, address, amount, network);

        const feeXdrPromise =
          activeTab === "deposit"
            ? buildDepositXdr(contractId, address, amount, network)
            : buildWithdrawXdr(contractId, address, amount, network);

        const [{ shares, error: sharesError, assets, error: assetsError }, sharePriceResp, feeXdr] =
          await Promise.all([
            previewPromise.then((resp: any) => resp),
            getSharePrice(contractId, address, network),
            feeXdrPromise,
          ]);

        const feeResp = await estimateTransactionFee(feeXdr, network);

        const outputValue =
          activeTab === "deposit"
            ? sharesError
              ? 0
              : Number(shares || 0)
            : assetsError
              ? 0
              : Number(assets || 0);

        const feeXlm = feeResp.fee ? Number(feeResp.fee) / 1e7 : 0;

        setPreview({
          outputValue,
          sharePrice: Number(sharePriceResp.sharePrice || 0),
          feeXlm,
        });
      } catch {
        setPreview(EMPTY_PREVIEW);
      } finally {
        setPreviewLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [amount, activeTab, connected, address, contractId, network]);

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    localStorage.setItem("terms_accepted", "true");
    setShowTermsModal(false);
  };

  const handlePrivacyAccept = () => {
    setPrivacyAccepted(true);
    localStorage.setItem("privacy_accepted", "true");
    setShowPrivacyModal(false);
  };

  const handleLegalAgreement = () => {
    if (!termsAccepted || !privacyAccepted) {
      return;
    }

    setShowLegalWarning(false);
    toast.success("Legal documents accepted");
  };

  const handleTimeframeChange = (timeframe: Timeframe) => {
    setSelectedTimeframe(timeframe);
  };

  const handleDeposit = useCallback(async () => {
    if (!connected || !address || !amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      setShowLegalWarning(true);
      return;
    }

    const pendingId = addPendingDeposit(amount);
    const toastId = toast.loading("Processing deposit...");
    setLoading(true);

    try {
      const passphrase = getNetworkPassphrase(network);
      const xdr = await buildDepositXdr(contractId, address, amount, network);
      const { result: assembledXdr, error: assembleError } = await simulateAndAssembleTransaction(xdr, network);

      if (assembleError || !assembledXdr) {
        throw new Error(assembleError || "Failed to assemble transaction");
      }

      setSigningStep("signing");
      const { signedTxXdr, error: signError } = await signTransaction(assembledXdr, passphrase);
      if (signError || !signedTxXdr) {
        throw new Error(signError || "Failed to sign transaction");
      }

      setSigningStep("submitting");
      const { hash, error: submitError } = await submitTransaction(signedTxXdr, network);
      if (submitError || !hash) {
        throw new Error(submitError || "Failed to submit transaction");
      }

      confirmTx(pendingId, hash);
      toast.success(`Deposit successful! Tx: ${hash.slice(0, 8)}...`, { id: toastId });
      setSigningStep("success");
      setAmount("");

      // Persist entry price per user address on first deposit
      if (address && metrics?.sharePrice) {
        const storageKey = `xh_entry_price_${address}`;
        if (!localStorage.getItem(storageKey)) {
          localStorage.setItem(storageKey, metrics.sharePrice);
        }
      }

      await loadVaultData();
    } catch (error) {
      failTx(pendingId);
      const message = error instanceof Error ? error.message : "Deposit failed";
      toast.error(message, { id: toastId });
      setSigningErrorMessage(message);
      setSigningStep("error");
    } finally {
      setLoading(false);
    }
  }, [
    connected,
    address,
    amount,
    termsAccepted,
    privacyAccepted,
    addPendingDeposit,
    network,
    contractId,
    signTransaction,
    confirmTx,
    loadVaultData,
    failTx,
    metrics?.sharePrice,
  ]);

  const handleWithdraw = useCallback(async () => {
    if (!connected || !address || !amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount > optimisticShares) {
      toast.error(`Insufficient balance. You have ${optimisticShares.toFixed(2)} shares.`);
      return;
    }

    const pendingId = addPendingWithdraw(amount);
    const toastId = toast.loading("Processing withdrawal...");
    setLoading(true);

    try {
      const passphrase = getNetworkPassphrase(network);
      const xdr = await buildWithdrawXdr(contractId, address, amount, network);
      const { result: assembledXdr, error: assembleError } = await simulateAndAssembleTransaction(xdr, network);

      if (assembleError || !assembledXdr) {
        throw new Error(assembleError || "Failed to assemble transaction");
      }

      setSigningStep("signing");
      const { signedTxXdr, error: signError } = await signTransaction(assembledXdr, passphrase);

      if (signError || !signedTxXdr) {
        throw new Error(signError || "Failed to sign transaction");
      }

      setSigningStep("submitting");
      const { hash, error: submitError } = await submitTransaction(signedTxXdr, network);

      if (submitError || !hash) {
        throw new Error(submitError || "Failed to submit transaction");
      }

      confirmTx(pendingId, hash);
      toast.success(`Withdrawal successful! Tx: ${hash.slice(0, 8)}...`, { id: toastId });
      setSigningStep("success");
      setAmount("");
      await loadVaultData();
    } catch (error) {
      failTx(pendingId);
      const message = error instanceof Error ? error.message : "Withdraw failed";
      toast.error(message, { id: toastId });
      setSigningErrorMessage(message);
      setSigningStep("error");
    } finally {
      setLoading(false);
    }
  }, [
    connected,
    address,
    amount,
    optimisticShares,
    addPendingWithdraw,
    network,
    contractId,
    signTransaction,
    confirmTx,
    loadVaultData,
    failTx,
  ]);

  const feeUsd = preview.feeXlm * (prices.XLM || 0);
  const outputLabel = activeTab === "deposit" ? "shares" : "assets";
  const inputId = activeTab === "deposit" ? "deposit-amount" : "withdraw-amount";
  const activePending = pendingTxs.filter((tx) => tx.status === "pending");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>

      {hasPending && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-yellow-600 text-sm">
          <Clock className="w-4 h-4 animate-pulse" />
          {activePending.length} pending transaction{activePending.length > 1 ? "s" : ""} - balances shown are estimated
        </div>
      )}

      {/* Pending transactions indicator */}
      {hasPending && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-yellow-600 text-sm">
          <Clock className="w-4 h-4 animate-pulse" />
          {activePending.length} pending transaction{activePending.length > 1 ? "s" : ""} —
          balances shown are estimated
        </div>
      )}

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
            {t("deposit")}
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
            {t("withdraw")}
          </button>
        </div>

        <div className="p-6 space-y-4">
          {connected && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("yourBalance")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {optimisticBalance.toFixed(2)} XLM
                    {hasPending && <span className="text-xs text-yellow-600 ml-1">*</span>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("yourShares")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {optimisticShares.toFixed(2)}
                    {hasPending && <span className="text-xs text-yellow-600 ml-1">*</span>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("currentAPY")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics ? (parseFloat(metrics.sharePrice) * 100).toFixed(2) : "0.00"}%</div>
                </CardContent>
              </Card>
            </div>
          )}

          <div>
            <label htmlFor={inputId} className="block text-sm font-medium mb-2">
              {activeTab === "deposit" ? t("depositAmount") : t("withdrawAmount")}
            </label>
            <Input
              id={inputId}
              type="number"
              placeholder={activeTab === "deposit" ? t("enterAmountToDeposit") : t("enterAmountToWithdraw")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!connected || loading}
            />
          </div>

          <div className="rounded-lg border p-4 bg-muted/20" data-testid="vault-preview-section">
            <div className="text-sm font-medium mb-3">Preview</div>
            {previewLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-52" />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between" data-testid="vault-preview-output">
                  <span>{activeTab === "deposit" ? "You receive" : "You receive back"}</span>
                  <span className="font-medium">
                    {preview.outputValue.toFixed(4)} {outputLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Exchange rate</span>
                  <span>{preview.sharePrice.toFixed(6)} assets/share</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground" data-testid="vault-preview-fee">
                  <span>Estimated Soroban fee</span>
                  <span>
                    {preview.feeXlm.toFixed(5)} XLM ({`$${feeUsd.toFixed(4)}`})
                  </span>
                </div>
              </div>
            )}
          </div>

          {activeTab === "deposit" && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <FileText className="w-3 h-3" />
              <span>Terms of Service</span>
              <Shield className="w-3 h-3" />
              <span>Privacy Policy</span>
            </div>
          )}

          <Button
            onClick={activeTab === "deposit" ? handleDeposit : handleWithdraw}
            disabled={!connected || loading || !amount || parseFloat(amount) <= 0}
            className="w-full"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("processing")}
              </div>
            ) : activeTab === "deposit" ? (
              t("deposit")
            ) : (
              t("withdraw")
            )}
          </Button>

          {hasPending && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Pending Transactions
              </h3>
              {activePending.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 border-dashed">
                  <div className="flex items-center gap-3">
                    {tx.type === "deposit" ? (
                      <ArrowUpFromLine className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownToLine className="w-4 h-4 text-blue-500" />
                    )}
                    <span className="text-sm">
                      {tx.type === "deposit" ? "Deposit" : "Withdraw"} {tx.amount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-yellow-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {connected && (
        <div className="mt-8 rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">APY History</h2>
            <TimeframeFilter selectedTimeframe={selectedTimeframe} onTimeframeChange={handleTimeframeChange} loading={chartLoading} />
          </div>
          <VaultAPYChart data={chartData} loading={chartLoading} error={chartError} />
        </div>
      )}

      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} onAccept={handleTermsAccept} showAcceptCheckbox={true} />

      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={handlePrivacyAccept}
        showAcceptCheckbox={true}
      />

      <SigningOverlay step={signingStep} errorMessage={signingErrorMessage} onDismiss={() => setSigningStep("idle")} />

      {showLegalWarning && (
        <Modal isOpen={showLegalWarning} onClose={() => setShowLegalWarning(false)} title={t("legalAgreementRequired")} size="md">
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
                  <span className="font-medium">{t("termsOfService")}</span>
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
                  <span className="font-medium">{t("privacyPolicy")}</span>
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
              <Button onClick={handleLegalAgreement} disabled={!termsAccepted || !privacyAccepted}>
                {t("continueToDeposit")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
