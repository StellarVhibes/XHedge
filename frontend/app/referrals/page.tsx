"use client";


import { Users, Copy, Share2, Award, TrendingUp, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { fetchReferralData, ReferralData } from "@/lib/stellar";

import { useTranslations } from "@/lib/i18n-context";

export default function ReferralsPage() {
  const t = useTranslations("Referrals");
  const { address, connected } = useWallet();
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchReferralData(address);
      setData(result);
    } catch (error) {
      console.error("Failed to fetch referral data:", error);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const referralLink = address
    ? `${window.location.origin}?ref=${address}`
    : t('connectToGenerate');

  const copyToClipboard = () => {
    if (!address) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading referral data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Referral Link Card */}
        <div className="p-6 rounded-lg border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">{t('yourLink')}</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            {t('linkDescription')}
          </p>

          <div className="flex items-center gap-2 p-3 rounded-md bg-muted border font-mono text-sm overflow-hidden">
            <span className="flex-1 truncate w-12 md:max-w-full">{referralLink}</span>
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-md hover:bg-background transition-colors"
              title="Copy to clipboard"
            >
              <Copy className={`w-4 h-4 ${copied ? "text-green-500" : "text-muted-foreground"}`} />
            </button>
          </div>

          {!connected && (
            <p className="text-xs text-amber-500">
              {t('connectToGenerate')}
            </p>
          )}
        </div>

        {/* Statistics Summary */}
        <div className="grid md:grid-cols-2 gap-4">
          <StatCard
            title={t('stats.totalReferrals')}
            value={data?.totalReferrals.toString() || "0"}
            icon={<Users className="w-4 h-4 text-blue-500" />}
          />
          <StatCard
            title={t('stats.activeFriends')}
            value={data?.activeStakers.toString() || "0"}
            icon={<Award className="w-4 h-4 text-purple-500" />}
          />
          <StatCard
            title={t('stats.totalEarned')}
            value={`$${data?.totalEarnings || "0.00"}`}
            icon={<TrendingUp className="w-4 h-4 text-green-500" />}
            highlight
          />
          <StatCard
            title={t('stats.pending')}
            value={`$${data?.pendingEarnings || "0.00"}`}
            icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
          />
        </div>
      </div>

      {/* Rewards Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-lg text-foreground">{t('recentRewards')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm text-left whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-medium">{t('table.friendAddress')}</th>
                <th className="px-6 py-3 font-medium">{t('table.activity')}</th>
                <th className="px-6 py-3 font-medium">{t('table.reward')}</th>
                <th className="px-6 py-3 font-medium">{t('table.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.recentRewards && data.recentRewards.length > 0 ? (
                data.recentRewards.map((reward, i) => (
                  <RewardRow
                    key={i}
                    address={reward.address}
                    activity={reward.activity}
                    reward={reward.reward}
                    date={reward.date}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    {t('noRewards')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

function StatCard({ title, value, icon, highlight }: StatCardProps) {
  return (
    <div className="p-4 rounded-lg bg-card border flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        {icon}
        {title}
      </div>
      <div className={`text-2xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

interface RewardRowProps {
  address: string;
  activity: string;
  reward: string;
  date: string;
}

function RewardRow({ address, activity, reward, date }: RewardRowProps) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-6 py-4 font-mono text-muted-foreground underline decoration-dotted">{address}</td>
      <td className="px-6 py-4 text-foreground">{activity}</td>
      <td className="px-6 py-4 font-semibold text-green-500">+{reward}</td>
      <td className="px-6 py-4 text-muted-foreground">{date}</td>
    </tr>
  );
}
