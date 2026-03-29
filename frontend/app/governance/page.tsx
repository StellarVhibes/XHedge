"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Vote, Info, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "@/lib/i18n-context";

interface Proposal {
    id: string;
    title: string;
    description: string;
    status: "active" | "closed" | "passed" | "rejected";
    voteCount: number;
    endTime: string;
}

const mockProposals: Proposal[] = [
    {
        id: "1",
        title: "XH-001: Increase Vault Capacity",
        description: "Proposal to increase the maximum vault capacity to 1,000,000 XLM to accommodate more users.",
        status: "active",
        voteCount: 12540,
        endTime: "2026-04-10T12:00:00Z",
    },
    {
        id: "2",
        title: "XH-002: Add EURC Strategy",
        description: "Introduce a new hedging strategy for EURC to support European users.",
        status: "active",
        voteCount: 8900,
        endTime: "2026-04-15T15:00:00Z",
    },
    {
        id: "3",
        title: "XH-003: Update Fee Structure",
        description: "Adjust the management fee from 0.5% to 0.4% to remain competitive.",
        status: "passed",
        voteCount: 45000,
        endTime: "2026-03-20T10:00:00Z",
    },
];

export default function GovernancePage() {
    const t = useTranslations("Governance");

    const getStatusBadge = (status: Proposal["status"]) => {
        switch (status) {
            case "active":
                return <Badge variant="default" className="bg-primary">{t(`status.active`)}</Badge>;
            case "closed":
                return <Badge variant="secondary">{t(`status.closed`)}</Badge>;
            case "passed":
                return <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {t(`status.passed`)}
                </Badge>;
            case "rejected":
                return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/50">
                    <XCircle className="w-3 h-3 mr-1" />
                    {t(`status.rejected`)}
                </Badge>;
            default:
                return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Proposals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockProposals.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Voting</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {mockProposals.filter(p => p.status === "active").length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Governance Tokens</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,240,500 XH</div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{t('activeProposals')}</h2>
                </div>

                <div className="grid gap-4">
                    {mockProposals.map((proposal) => (
                        <Card key={proposal.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">{proposal.title}</CardTitle>
                                        <CardDescription className="line-clamp-2">{proposal.description}</CardDescription>
                                    </div>
                                    {getStatusBadge(proposal.status)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Vote className="w-4 h-4" />
                                        <span className="font-medium text-foreground">
                                            {proposal.voteCount.toLocaleString()} {t('voteCount')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        <span>
                                            {proposal.status === "active" ? "Ends in" : "Ended on"}{" "}
                                            {new Date(proposal.endTime).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="ml-auto flex items-center gap-2">
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <Info className="w-4 h-4" />
                                            Details
                                        </Button>
                                        {proposal.status === "active" && (
                                            <Button size="sm" className="gap-2 bg-primary/20 text-primary hover:bg-primary/30 border-none cursor-not-allowed">
                                                <Vote className="w-4 h-4" />
                                                Vote
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <Card className="border-dashed bg-muted/30">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Vote className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium">{t('comingSoon')}</h3>
                    <p className="text-muted-foreground max-w-sm mt-2">
                        We are working on bringing on-chain voting directly to the XHedge dashboard. Stay tuned for updates!
                    </p>
                    <div className="mt-6 flex gap-3">
                        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
