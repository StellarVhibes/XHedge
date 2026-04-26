"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { fetchReferralData, ReferralData } from "@/lib/stellar";
import { Gift, Clock, History, RefreshCw, AlertCircle } from "lucide-react";

export function RewardSummary() {
    const { address } = useWallet();
    const [data, setData] = useState<ReferralData | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const loadData = useCallback(() => {
        if (!address) return;
        
        setLoading(true);
        setFetchError(null);

        fetchReferralData(address)
            .then((res) => {
                setData(res);
            })
            .catch((err) => {
                console.error("Failed to fetch referral data:", err);
                setFetchError("Unable to load referral data");
            })
            .finally(() => {
                setLoading(false);
            });
    }, [address]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (!address) {
        return null;
    }

    return (
        <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-2 mb-6">
                <Gift className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Reward Summary</h2>
            </div>

            {fetchError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4 bg-destructive/5 rounded-lg border border-destructive/20 mb-4">
                    <div className="p-3 rounded-full bg-destructive/10">
                        <AlertCircle className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-destructive">{fetchError}</p>
                        <p className="text-xs text-muted-foreground mt-1">Please check your connection and try again.</p>
                    </div>
                    <button 
                        onClick={loadData}
                        className="px-6 py-2 text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Retry
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid sm:grid-cols-2 gap-4 mb-8">
                        <div className="p-4 rounded-lg bg-accent/50 border">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <Gift className="w-4 h-4" />
                                Claimed Rewards
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                {loading ? "..." : `$${data?.totalEarnings || "0.00"}`}
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                            <div className="flex items-center gap-2 text-sm text-primary mb-1">
                                <Clock className="w-4 h-4" />
                                Pending Rewards
                            </div>
                            <div className="text-2xl font-bold text-primary">
                                {loading ? "..." : `$${data?.pendingEarnings || "0.00"}`}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                            <History className="w-4 h-4" />
                            Recent Distribution History
                        </div>

                        {loading ? (
                            <div className="text-sm text-center py-4 text-muted-foreground">Loading history...</div>
                        ) : !data || data.recentRewards.length === 0 ? (
                            <div className="text-sm text-center py-4 text-muted-foreground">No recent rewards</div>
                        ) : (
                            <div className="space-y-3">
                                {data.recentRewards.map((reward, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm p-3 rounded-md border bg-background">
                                        <div>
                                            <div className="font-medium text-foreground">{reward.activity}</div>
                                            <div className="text-muted-foreground text-xs">{reward.date}</div>
                                        </div>
                                        <div className="font-semibold text-green-500">
                                            +{reward.reward}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

