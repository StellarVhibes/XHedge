"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2, Vote, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useNetwork } from "@/app/context/NetworkContext";
import { useWallet } from "@/hooks/use-wallet";
import { getVolatilityShieldAddress } from "@/lib/contracts.config";
import { useTranslations } from "@/lib/i18n-context";
import {
  buildCastVoteXdr,
  buildProposeActionXdr,
  getGovernanceSummary,
  getNetworkPassphrase,
  getProposals,
  GovernanceProposal,
  simulateAndAssembleTransaction,
  submitTransaction,
} from "@/lib/stellar";
import { trackVoteCast } from "@/lib/analytics";

const FALLBACK_SOURCE = "GBXFQY665K3S3SZESTSY3A4Y5Z6K2O3B4C5D6E7F8G9H0I1J2K3L4M5N";

function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) {
    return "Ready for execution";
  }

  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export default function GovernancePage() {
  const t = useTranslations("Governance");
  const { connected, address, signTransaction } = useWallet();
  const { network } = useNetwork();

  const contractId = useMemo(() => getVolatilityShieldAddress(network), [network]);
  const [loading, setLoading] = useState(false);
  const [voteLoadingId, setVoteLoadingId] = useState<string | null>(null);
  const [proposeLoading, setProposeLoading] = useState(false);
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [guardianList, setGuardianList] = useState<string[]>([FALLBACK_SOURCE]);
  const [threshold, setThreshold] = useState(1);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [proposalTitle, setProposalTitle] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const sourceAddress = address || process.env.NEXT_PUBLIC_RPC_READ_ADDRESS || FALLBACK_SOURCE;
  const isGuardian = !!address && guardianList.includes(address);

  const loadGovernance = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResp, proposalsResp] = await Promise.all([
        getGovernanceSummary(contractId, sourceAddress, network),
        getProposals(contractId, sourceAddress, network),
      ]);

      if (summaryResp.summary) {
        setGuardianList(summaryResp.summary.guardians);
        setThreshold(Math.max(summaryResp.summary.threshold, 1));
      }

      if (proposalsResp.error) {
        toast.error(proposalsResp.error);
      }

      setProposals(proposalsResp.proposals);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load governance");
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [contractId, sourceAddress, network]);

  useEffect(() => {
    loadGovernance();
  }, [loadGovernance]);

  const handleVote = useCallback(
    async (proposalId: string, support: boolean) => {
      if (!connected || !address || !isGuardian) {
        toast.error("Connect a guardian wallet to vote");
        return;
      }

      setVoteLoadingId(proposalId);
      const toastId = toast.loading("Submitting vote...");

      try {
        const passphrase = getNetworkPassphrase(network);
        const xdr = await buildCastVoteXdr(contractId, address, proposalId, support, network);
        const assembled = await simulateAndAssembleTransaction(xdr, network);

        if (assembled.error || !assembled.result) {
          throw new Error(assembled.error || "Failed to assemble vote transaction");
        }

        const signed = await signTransaction(assembled.result, passphrase);
        if (signed.error || !signed.signedTxXdr) {
          throw new Error(signed.error || "Failed to sign transaction");
        }

        const submitted = await submitTransaction(signed.signedTxXdr, network);
        if (submitted.error || !submitted.hash) {
          throw new Error(submitted.error || "Failed to submit vote");
        }

        trackVoteCast("governance", support ? "for" : "against");
        toast.success(`Vote submitted: ${submitted.hash.slice(0, 8)}...`, { id: toastId });
        await loadGovernance();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Vote failed", { id: toastId });
      } finally {
        setVoteLoadingId(null);
      }
    },
    [connected, address, isGuardian, network, contractId, signTransaction, loadGovernance]
  );

  const handleProposeAction = useCallback(async () => {
    if (!connected || !address || !isGuardian) {
      toast.error("Only connected guardians can create proposals");
      return;
    }

    if (!proposalTitle.trim()) {
      toast.error("Enter a proposal title");
      return;
    }

    setProposeLoading(true);
    const toastId = toast.loading("Submitting proposal...");

    try {
      const passphrase = getNetworkPassphrase(network);
      const xdr = await buildProposeActionXdr(contractId, address, proposalTitle.trim(), network);
      const assembled = await simulateAndAssembleTransaction(xdr, network);

      if (assembled.error || !assembled.result) {
        throw new Error(assembled.error || "Failed to assemble proposal transaction");
      }

      const signed = await signTransaction(assembled.result, passphrase);
      if (signed.error || !signed.signedTxXdr) {
        throw new Error(signed.error || "Failed to sign proposal transaction");
      }

      const submitted = await submitTransaction(signed.signedTxXdr, network);
      if (submitted.error || !submitted.hash) {
        throw new Error(submitted.error || "Failed to submit proposal");
      }

      toast.success(`Proposal submitted: ${submitted.hash.slice(0, 8)}...`, { id: toastId });
      setProposalTitle("");
      await loadGovernance();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit proposal", { id: toastId });
    } finally {
      setProposeLoading(false);
    }
  }, [connected, address, isGuardian, proposalTitle, network, contractId, signTransaction, loadGovernance]);

  const getStatusBadge = (proposal: GovernanceProposal) => {
    if (proposal.executed || proposal.status === "executed") {
      return (
        <Badge variant="outline" className="text-green-600 border-green-500/40 bg-green-500/10">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Executed
        </Badge>
      );
    }

    if (proposal.status === "approved") {
      return <Badge className="bg-emerald-600">Approved</Badge>;
    }

    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8" data-testid="governance-page">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Proposals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proposals.filter((p) => !p.executed).length}</div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Guardian Threshold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{threshold}</div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Connected Guardian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isGuardian ? "Yes" : "No"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Propose Action</CardTitle>
          <CardDescription>Create a new governance action for guardians to approve.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={proposalTitle}
            onChange={(e) => setProposalTitle(e.target.value)}
            placeholder="Describe action (e.g. Set paused = true)"
            disabled={!connected || !isGuardian || proposeLoading}
          />
          <Button onClick={handleProposeAction} disabled={!connected || !isGuardian || !proposalTitle.trim() || proposeLoading}>
            {proposeLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              "Propose Action"
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4" data-testid="governance-proposal-list">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t("activeProposals")}</h2>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8 text-muted-foreground">Loading proposals...</CardContent>
          </Card>
        ) : proposals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-muted-foreground">{t("noProposals")}</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {proposals.map((proposal) => {
              const progress = Math.min((proposal.approvals / Math.max(proposal.threshold, 1)) * 100, 100);
              const timelockLeft = Math.max(proposal.timelockEndsAt - now, 0);

              return (
                <Card key={proposal.id} className="overflow-hidden" data-testid={`proposal-card-${proposal.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{proposal.title}</CardTitle>
                        <CardDescription>{proposal.description}</CardDescription>
                      </div>
                      {getStatusBadge(proposal)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>Approvals</span>
                        <span>
                          {proposal.approvals} / {proposal.threshold}
                        </span>
                      </div>
                      <Progress value={progress} />
                    </div>

                    {proposal.status === "approved" && !proposal.executed && (
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Timelock countdown: {formatCountdown(timelockLeft)}
                      </div>
                    )}

                    {connected && isGuardian && !proposal.executed && (
                      <div className="flex gap-2" data-testid={`vote-actions-${proposal.id}`}>
                        <Button
                          size="sm"
                          onClick={() => handleVote(proposal.id, true)}
                          disabled={voteLoadingId === proposal.id}
                          data-testid={`vote-for-${proposal.id}`}
                        >
                          {voteLoadingId === proposal.id ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Voting...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <Vote className="w-4 h-4" />
                              Vote For
                            </span>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVote(proposal.id, false)}
                          disabled={voteLoadingId === proposal.id}
                          data-testid={`vote-against-${proposal.id}`}
                        >
                          <XCircle className="w-4 h-4" />
                          Vote Against
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
