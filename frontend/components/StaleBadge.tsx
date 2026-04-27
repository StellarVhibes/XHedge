"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { getTimeAgo } from "@/hooks/use-stale-data";

interface StaleBadgeProps {
  lastFetchedAt: Date | null;
  isStale: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/**
 * Displays a staleness badge showing when data was last fetched.
 * Turns amber when data is stale and provides an optional refresh action.
 */
export function StaleBadge({
  lastFetchedAt,
  isStale,
  onRefresh,
  refreshing = false,
}: StaleBadgeProps) {
  const [timeAgo, setTimeAgo] = useState(() => getTimeAgo(lastFetchedAt));

  // Update the "time ago" label every 30 seconds
  useEffect(() => {
    setTimeAgo(getTimeAgo(lastFetchedAt));
    const interval = setInterval(() => {
      setTimeAgo(getTimeAgo(lastFetchedAt));
    }, 30_000);
    return () => clearInterval(interval);
  }, [lastFetchedAt]);

  if (!lastFetchedAt) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        isStale
          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
          : "bg-green-500/10 text-green-500 border border-green-500/20"
      }`}
      title={`Last updated: ${lastFetchedAt.toLocaleTimeString()}`}
    >
      {isStale ? (
        <AlertCircle className="h-3 w-3 shrink-0" />
      ) : (
        <CheckCircle2 className="h-3 w-3 shrink-0" />
      )}
      <span>{isStale ? "Stale" : "Live"} · {timeAgo}</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="ml-0.5 rounded-full p-0.5 hover:bg-current/10 transition-colors disabled:opacity-50"
          aria-label="Refresh data"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
}
