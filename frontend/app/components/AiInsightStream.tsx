"use client";

import { RefreshCw, Info, AlertTriangle } from "lucide-react";

export type InsightType = "rebalance" | "info" | "warning";

export interface InsightEntry {
  id: string;
  timestamp: Date;
  type: InsightType;
  message: string;
}

const MOCK_ENTRIES: InsightEntry[] = [
  {
    id: "1",
    timestamp: new Date("2026-02-23T01:00:00"),
    type: "info",
    message: "AI engine initialised. Monitoring FX feeds.",
  },
  {
    id: "2",
    timestamp: new Date("2026-02-23T01:00:15"),
    type: "info",
    message: "FX feed updated: XLM/USD 0.1124",
  },
  {
    id: "3",
    timestamp: new Date("2026-02-23T01:00:30"),
    type: "rebalance",
    message: "Rebalance Triggered - USDC to XLM: 45% allocation threshold exceeded",
  },
  {
    id: "4",
    timestamp: new Date("2026-02-23T01:01:00"),
    type: "info",
    message: "Vault APY recalculated: 7.42%",
  },
  {
    id: "5",
    timestamp: new Date("2026-02-23T01:01:20"),
    type: "warning",
    message: "Volatility spike detected - risk level elevated to HIGH",
  },
  {
    id: "6",
    timestamp: new Date("2026-02-23T01:01:45"),
    type: "rebalance",
    message: "Rebalance Triggered - defensive shift: XLM to USDC: 60% stable allocation",
  },
  {
    id: "7",
    timestamp: new Date("2026-02-23T01:02:10"),
    type: "info",
    message: "Volatility normalised. Risk level returned to MEDIUM.",
  },
  {
    id: "8",
    timestamp: new Date("2026-02-23T01:02:40"),
    type: "rebalance",
    message: "Rebalance Triggered - portfolio drift correction applied",
  },
];

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
    return <RefreshCw size={14} className="shrink-0 text-blue-400" aria-hidden="true" />;
  }
  if (type === "warning") {
    return <AlertTriangle size={14} className="shrink-0 text-yellow-400" aria-hidden="true" />;
  }
  return <Info size={14} className="shrink-0 text-slate-400" aria-hidden="true" />;
}

interface AiInsightStreamProps {
  entries?: InsightEntry[];
}

function renderEntries(entries: InsightEntry[], duplicate = false) {
  return entries.map((entry) => (
    <div
      key={duplicate ? `dup-${entry.id}` : entry.id}
      className={[
        "flex items-start gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
        entry.type === "rebalance"
          ? "bg-blue-950/60 text-blue-200"
          : entry.type === "warning"
            ? "bg-yellow-950/60 text-yellow-200"
            : "text-slate-300",
      ].join(" ")}
    >
      <span className="mt-0.5 shrink-0 font-mono text-slate-500">
        {formatTime(entry.timestamp)}
      </span>
      <EntryIcon type={entry.type} />
      <span className="leading-relaxed">
        {entry.type === "rebalance" ? (
          <>
            <span className="mr-1 font-semibold text-blue-300">
              Rebalance Triggered
            </span>
            {entry.message.replace(/^Rebalance Triggered\s*[-]?\s*/i, "- ")}
          </>
        ) : (
          entry.message
        )}
      </span>
    </div>
  ));
}

export function AiInsightStream({ entries = MOCK_ENTRIES }: AiInsightStreamProps) {
  return (
    <section
      aria-label="AI Insight Stream"
      className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 shadow-lg"
    >
      <header className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-100">
          AI Insight Stream
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-green-400">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
          Live
        </span>
      </header>

      <div className="relative h-64 overflow-hidden px-4 py-3">
        {entries.length === 0 ? (
          <p className="text-xs text-slate-500">No AI insights yet.</p>
        ) : (
          <div
            className="ai-log-track"
            role="log"
            aria-live="polite"
            aria-label="AI decision log"
          >
            <div className="flex flex-col gap-1">{renderEntries(entries)}</div>
            <div className="flex flex-col gap-1" aria-hidden="true">
              {renderEntries(entries, true)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
