"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowUpFromLine, ArrowDownToLine, Loader2, FileText, Shield } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/app/context/NetworkContext";
import { buildDepositXdr, buildWithdrawXdr, simulateAndAssembleTransaction, submitTransaction, fetchVaultData, VaultMetrics, getNetworkPassphrase, estimateTransactionFee } from "@/lib/stellar";
import VaultAPYChart from "@/components/VaultAPYChart";
import TimeframeFilter, { Timeframe } from "@/components/TimeframeFilter";
import { fetchApyData, DataPoint } from "@/lib/chart-data";
import TermsModal from "@/components/TermsModal";
import PrivacyModal from "@/components/PrivacyModal";
import { Modal } from "@/components/ui/modal";
import SigningOverlay, { SigningStep } from "@/components/SigningOverlay";
import { SUPPORTED_ASSETS, VAULT_CONTRACT_ID } from "@/contracts.config";
import { MetricTooltip } from "@/components/MetricTooltip";

type TabType = "deposit" | "withdraw";

import { useTranslations } from "@/lib/i18n-context";

export default function VaultPage() {
  const t = useTranslations("Vault");
  const commonT = useTranslations("Common");
  const { connected, address, signTransaction } = useWallet();
  const { network } = useNetwork();
  const [activeTab, setActiveTab] = useState<TabType>("deposit");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingStep, setSigningStep] = useState<SigningStep>("idle");
  const [signingErrorMessage, setSigningErrorMessage] = useState("");
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [estimatingFee, setEstimatingFee] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [metrics, setMetrics] = useState<VaultMetrics | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1M');
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string>("USDC");

  // Legal acceptance state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showLegalWarning, setShowLegalWarning] = useState(false);

  // Large withdrawal confirmation
  const LARGE_WITHDRAW_THRESHOLD = parseFloat(
    process.env.NEXT_PUBLIC_LARGE_WITHDRAW_THRESHOLD_PCT ?? "50"
  ) / 100;
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

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
    void handleTimeframeChange(selectedTimeframe);
  }, []);

  // Handle timeframe changes with loading state
  const handleTimeframeChange = async (timeframe: Timeframe) => {
    setChartLoading(true);
    setSelectedTimeframe(timeframe);

    try {
      const data = await fetchApyData(timeframe);
      setChartData(data);
    } finally {
      setChartLoading(false);
    }
  };

  // Load vault data
  useEffect(() => {
    if (connected && network) {
      loadVaultData();
    }
  }, [connected, network]);

  // Initialize selected asset from config once network is known.
  useEffect(() => {
    if (!network) return;
    if (selectedAssetId) return;
    const first = (SUPPORTED_ASSETS[network] || []).find((a) => !!a.contractId);
    if (first) {
      setSelectedAssetId(first.contractId);
      setSelectedAssetSymbol(first.symbol);
    }
  }, [network, selectedAssetId]);

  const loadVaultData = async () => {
    try {
      setLoading(true);
      const data = await fetchVaultData(
        VAULT_CONTRACT_ID,
        address,
        network
      );
      setMetrics(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load vault data");
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
          xdr = await buildDepositXdr(VAULT_CONTRACT_ID, address, selectedAssetId, amount, network);
        } else {
          xdr = await buildWithdrawXdr(VAULT_CONTRACT_ID, address, selectedAssetId, amount, network);
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
  }, [amount, activeTab, connected, address, network, selectedAssetId]);

  const userBalance = metrics ? parseFloat(metrics.userBalance) / 1e7 : 0;
  const userShares = metrics ? parseFloat(metrics.userShares) / 1e7 : 0;

  const handleDeposit = useCallback(async () => {
    if (!connected || !address || !amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Check legal acceptance for first-time users
    if (!termsAccepted || !privacyAccepted) {
      setShowLegalWarning(true);
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Processing deposit...");
    try {
      const passphrase = getNetworkPassphrase(network);

      const xdr = await buildDepositXdr(
        VAULT_CONTRACT_ID,
        address,
        selectedAssetId,
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

      toast.success(`Deposit successful! Tx: ${hash.slice(0, 8)}...`, { id: toastId });
      setSigningStep("success");
      setAmount("");
      await loadVaultData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Deposit failed";
      toast.error(msg, { id: toastId });
      setSigningErrorMessage(msg);
      setSigningStep("error");
    } finally {
      setLoading(false);
    }
  }, [connected, address, amount, network, signTransaction, loadVaultData, termsAccepted, privacyAccepted, selectedAssetId]);

  const handleWithdraw = useCallback(async () => {
    if (!connected || !address || !amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount > userShares) {
      toast.error(`Insufficient balance. You have ${userShares.toFixed(2)} shares.`);
      return;
    }

    // Show confirmation modal for large withdrawals
    if (userShares > 0 && withdrawAmount / userShares > LARGE_WITHDRAW_THRESHOLD) {
      setShowWithdrawConfirm(true);
      return;
    }

    await executeWithdraw();
  }, [connected, address, amount, userShares, LARGE_WITHDRAW_THRESHOLD]);

  const executeWithdraw = useCallback(async () => {
    setShowWithdrawConfirm(false);
    setLoading(true);
    const toastId = toast.loading("Processing withdrawal...");
    try {
      const passphrase = getNetworkPassphrase(network);

      const xdr = await buildWithdrawXdr(
        VAULT_CONTRACT_ID,
        address,
        selectedAssetId,
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

      toast.success(`Withdrawal successful! Tx: ${hash.slice(0, 8)}...`, { id: toastId });
      setSigningStep("success");
      setAmount("");
      await loadVaultData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Withdraw failed";
      toast.error(msg, { id: toastId });
      setSigningErrorMessage(msg);
      setSigningStep("error");
    } finally {
      setLoading(false);
    }
  }, [connected, address, amount, userShares, network, signTransaction, loadVaultData, selectedAssetId]);

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
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

      <div className="rounded-lg border bg-card">
        {/* Accessible ARIA tablist — arrow keys navigate, Enter/Space activate */}
        <div
          role="tablist"
          aria-label="Vault actions"
          className="flex border-b"
          onKeyDown={(e) => {
            const tabs: TabType[] = ["deposit", "withdraw"];
            const idx = tabs.indexOf(activeTab);
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              setActiveTab(tabs[(idx + 1) % tabs.length]);
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length]);
            } else if (e.key === "Home") {
              e.preventDefault();
              setActiveTab(tabs[0]);
            } else if (e.key === "End") {
              e.preventDefault();
              setActiveTab(tabs[tabs.length - 1]);
            }
          }}
        >
          <button
            role="tab"
            id="tab-deposit"
            aria-controls="tabpanel-deposit"
            aria-selected={activeTab === "deposit"}
            tabIndex={activeTab === "deposit" ? 0 : -1}
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
              activeTab === "deposit"
                ? "bg-background text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowUpFromLine className="h-4 w-4" />
            {t('deposit')}
          </button>
          <button
            role="tab"
            id="tab-withdraw"
            aria-controls="tabpanel-withdraw"
            aria-selected={activeTab === "withdraw"}
            tabIndex={activeTab === "withdraw" ? 0 : -1}
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
              activeTab === "withdraw"
                ? "bg-background text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDownToLine className="h-4 w-4" />
            {t('withdraw')}
          </button>
        </div>

        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="p-6"
        >
          {/* Asset selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Asset</label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={selectedAssetId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedAssetId(id);
                const entry = SUPPORTED_ASSETS[network]?.find((a) => a.contractId === id);
                setSelectedAssetSymbol(entry?.symbol || "ASSET");
              }}
              disabled={!network}
            >
              {(SUPPORTED_ASSETS[network] || [])
                .filter((a) => !!a.contractId)
                .map((a) => (
                  <option key={a.contractId} value={a.contractId}>
                    {a.symbol}
                  </option>
                ))}
            </select>
          </div>

          {connected && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    <MetricTooltip label={t('yourBalance')} tip="Your current asset balance in the vault, reflecting deposited funds at the current share price." />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userBalance.toFixed(2)} XLM</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    <MetricTooltip label={t('yourShares')} tip="The number of vault shares (XHS) you hold. Redeeming shares returns the equivalent asset value at the current share price." />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userShares.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    <MetricTooltip label={t('currentAPY')} tip="Annualised percentage yield earned by the vault, derived from the current share price growth rate." />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics ? (parseFloat(metrics.sharePrice) * 100).toFixed(2) : "0.00"}%
                  </div>
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
              min="0"
              step="any"
              placeholder={activeTab === "deposit" ? t("enterAmountToDeposit") : t("enterAmountToWithdraw")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label={inputAriaLabel}
              aria-describedby={inputDescriptionId}
              aria-invalid={amountError ? true : undefined}
              disabled={!connected || loading}
            />
            <p
              id={inputDescriptionId}
              role={amountError ? "alert" : undefined}
              className={`mt-2 text-sm ${amountError ? "text-destructive" : "text-muted-foreground"}`}
            >
              {amountError ?? inputHint}
            </p>
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

          <Button
            onClick={activeTab === "deposit" ? handleDeposit : handleWithdraw}
            disabled={!connected || loading || !selectedAssetId || !amount || parseFloat(amount) <= 0}
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

        </div>
      </div>

      {/* Large Withdrawal Confirmation Modal */}
      {showWithdrawConfirm && (
        <Modal
          isOpen={showWithdrawConfirm}
          onClose={() => setShowWithdrawConfirm(false)}
          title="Confirm Large Withdrawal"
          size="md"
        >
          <div className="space-y-4" data-testid="withdraw-confirm-modal">
            <Alert>
              <AlertDescription>
                You are withdrawing more than {Math.round(LARGE_WITHDRAW_THRESHOLD * 100)}% of your share balance. Please review the details below before proceeding.
              </AlertDescription>
            </Alert>
            <div className="rounded-lg border divide-y text-sm">
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Shares to redeem</span>
                <span className="font-medium" data-testid="withdraw-confirm-shares">{parseFloat(amount).toFixed(4)} XHS</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Current share price</span>
                <span className="font-medium" data-testid="withdraw-confirm-share-price">
                  {metrics ? parseFloat(metrics.sharePrice).toFixed(6) : "—"} {selectedAssetSymbol}/share
                </span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Expected assets back</span>
                <span className="font-medium" data-testid="withdraw-confirm-assets">
                  {metrics
                    ? (parseFloat(amount) * parseFloat(metrics.sharePrice)).toFixed(4)
                    : "—"}{" "}
                  {selectedAssetSymbol}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">% of your balance</span>
                <span className="font-medium text-yellow-600" data-testid="withdraw-confirm-pct">
                  {userShares > 0 ? ((parseFloat(amount) / userShares) * 100).toFixed(1) : "0"}%
                </span>
              </div>
            </div>
            {metrics && parseFloat(metrics.sharePrice) < 1 && (
              <Alert>
                <AlertDescription className="text-yellow-700">
                  Share price is below 1.0. You may receive fewer assets than deposited due to vault performance or slippage.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setShowWithdrawConfirm(false)}
                data-testid="withdraw-confirm-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={executeWithdraw}
                data-testid="withdraw-confirm-proceed"
              >
                Confirm Withdrawal
              </Button>
            </div>
          </div>
        </Modal>
      )}

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

      <SigningOverlay
        step={signingStep}
        errorMessage={signingErrorMessage}
        onDismiss={() => setSigningStep("idle")}
      />

      {/* Legal Warning Modal */}
      {showLegalWarning && (
        <Modal
          isOpen={showLegalWarning}
          onClose={() => setShowLegalWarning(false)}
          title={t('legalAgreementRequired')}
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
                  <span className="font-medium">{t('termsOfService')}</span>
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
                  <span className="font-medium">{t('privacyPolicy')}</span>
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
                {t('continueToDeposit')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
