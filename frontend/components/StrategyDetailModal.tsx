"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";

export interface StrategyDetail {
  address: string;
  health: "Healthy" | "Flagged";
  currentBalance: number;
  targetAllocationPct: number;
  actualAllocationPct: number;
  lastHarvestLedger: number;
  apy: number | null;
}

interface StrategyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  detail: StrategyDetail | null;
  canFlag: boolean;
  onFlagStrategy?: (address: string) => void;
}

function truncateAddress(address: string) {
  if (!address) return "N/A";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export default function StrategyDetailModal({
  isOpen,
  onClose,
  detail,
  canFlag,
  onFlagStrategy,
}: StrategyDetailModalProps) {
  const [copied, setCopied] = useState(false);

  const allocationDelta = useMemo(() => {
    if (!detail) return 0;
    return Math.abs(detail.actualAllocationPct - detail.targetAllocationPct);
  }, [detail]);

  if (!detail) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Strategy Details" size="md">
      <div className="space-y-4" data-testid="strategy-detail-modal">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Strategy Address</p>
            <p className="font-mono text-sm">{truncateAddress(detail.address)}</p>
          </div>
          <button
            type="button"
            className="rounded border px-3 py-1 text-xs hover:bg-accent"
            onClick={async () => {
              await navigator.clipboard.writeText(detail.address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            aria-label={copied ? "Address copied" : "Copy strategy address"}
            aria-live="polite"
            data-testid="strategy-copy-address"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground" id="strategy-health-label">Health</span>
          <span
            className={`rounded px-2 py-1 text-xs font-semibold ${
              detail.health === "Healthy"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
            role="status"
            aria-labelledby="strategy-health-label"
            data-testid="strategy-health-badge"
          >
            {detail.health}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="font-semibold">{detail.currentBalance.toLocaleString()}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Recent APY</p>
            <p className="font-semibold">
              {detail.apy === null ? "N/A" : `${detail.apy.toFixed(2)}%`}
            </p>
          </div>
          <div className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Last Harvest Ledger</p>
            <p className="font-semibold">{detail.lastHarvestLedger}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Allocation Drift</p>
            <p className="font-semibold">{allocationDelta.toFixed(2)}%</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Target vs Actual Allocation</span>
            <span>
              {detail.targetAllocationPct.toFixed(2)}% / {detail.actualAllocationPct.toFixed(2)}%
            </span>
          </div>
          <div className="h-2 rounded bg-muted" role="img" aria-label={`Actual allocation: ${detail.actualAllocationPct.toFixed(2)}% of target ${detail.targetAllocationPct.toFixed(2)}%`}>
            <div
              className="h-2 rounded bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, detail.actualAllocationPct))}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        {canFlag ? (
          <button
            type="button"
            className="rounded border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            onClick={() => onFlagStrategy?.(detail.address)}
            aria-label={`Flag strategy ${truncateAddress(detail.address)} for review`}
            data-testid="strategy-flag-button"
          >
            Flag Strategy
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
