"use client";

import { RefreshCw, Info, AlertTriangle, Activity } from "lucide-react";
import { useAiInsights } from "@/hooks/use-ai-insights";

export type InsightType = "rebalance" | "info" | "warning";

export interface InsightEntry {
  id: string;
  timestamp: Date;
  type: InsightType;
  message: string;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

interface EntryIconProps {
  type: InsightType;
}

function EntryIcon({ type }: EntryIconProps) {
  if (type === "rebalance") {
    return <RefreshCw size={14} className="shrink-0 text-primary" aria-hidden="true" />;
  }
  if (type === "warning") {
    return <AlertTriangle size={14} className="shrink-0 text-amber-500" aria-hidden="true" />;
  }
  return <Info size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />;
}

interface AiInsightStreamProps {
  entries?: InsightEntry[];
}

function renderEntries(entries: InsightEntry[], duplicate = false) {
  return entries.map((entry) => (
    <div
      key={duplicate ? `dup-${entry.id}` : entry.id}
      className={[
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors max-md:flex-col",
        entry.type === "rebalance"
          ? "border-primary/20 bg-primary/10 text-foreground"
          : entry.type === "warning"
            ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
            : "border-transparent bg-muted/40 text-foreground",
      ].join(" ")}
    >
      <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground">
        {formatTime(entry.timestamp)}
      </span>
      <div className="flex items-start gap-2"><EntryIcon type={entry.type} />
      <span className="leading-relaxed">
        {entry.type === "rebalance" ? (
          <>
            <span className="mr-1 font-semibold text-primary">Rebalance Triggered</span>
            {entry.message.replace(/^Rebalance Triggered\s*[-]?\s*/i, "- ")}
          </>
        ) : (
          entry.message
        )}
      </span>
</div>
    </div>
  ));
}

function InsightSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-2 rounded-md border border-transparent bg-muted/20 px-3 py-3">
          <div className="h-3 w-12 rounded bg-muted-foreground/20" />
          <div className="h-4 w-4 rounded-full bg-muted-foreground/20" />
          <div className="h-3 w-full rounded bg-muted-foreground/20" />
        </div>
      ))}
    </div>
  );
}

export function AiInsightStream({ entries: propEntries }: AiInsightStreamProps) {
  const { entries: hookEntries, isLoading } = useAiInsights();
  
  const entries = propEntries || hookEntries;
  const showLiveBadge = !isLoading && entries.length > 0;

  return (
    <section aria-label="AI Insight Stream" className="w-full rounded-lg border bg-card shadow-sm">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">AI Insight Stream</h2>
        </div>
        {showLiveBadge && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        )}
      </header>

      <div className="relative h-[28rem] overflow-hidden px-6 py-4">
        {isLoading ? (
          <InsightSkeleton />
        ) : entries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No AI insights yet.</p>
          </div>
        ) : (
          <div className="ai-log-track" role="log" aria-live="polite" aria-label="AI decision log">
            <div className="flex flex-col gap-2">{renderEntries(entries)}</div>
            <div className="flex flex-col gap-2" aria-hidden="true">
              {renderEntries(entries, true)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

