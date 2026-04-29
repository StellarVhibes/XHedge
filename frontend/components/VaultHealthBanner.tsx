"use client";

import Link from "next/link";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";
import { useMemo, useState } from "react";

type Severity = "warning" | "critical";

interface VaultHealthBannerProps {
  unhealthyStrategiesCount: number;
  vaultPaused: boolean;
  cascadeHalt: boolean;
  detailsHref?: string;
}

function getLoadId(): string {
  if (typeof window === "undefined") return "server";
  return String(window.performance.timeOrigin);
}

export function VaultHealthBanner({
  unhealthyStrategiesCount,
  vaultPaused,
  cascadeHalt,
  detailsHref = "/governance",
}: VaultHealthBannerProps) {
  const health = useMemo(() => {
    if (vaultPaused || cascadeHalt) {
      return {
        severity: "critical" as Severity,
        message: "Critical: Vault operations are paused or emergency halt is active.",
      };
    }
    if (unhealthyStrategiesCount > 0) {
      return {
        severity: "warning" as Severity,
        message: `Warning: ${unhealthyStrategiesCount} strategy is unhealthy.`,
      };
    }
    return null;
  }, [cascadeHalt, unhealthyStrategiesCount, vaultPaused]);

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      sessionStorage.getItem("vault-health-banner-dismissed-load-id") === getLoadId()
    );
  });

  if (!health || dismissed) return null;

  const isCritical = health.severity === "critical";
  return (
    <div
      data-testid="vault-health-banner"
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        isCritical
          ? "border-red-300 bg-red-50 text-red-900"
          : "border-amber-300 bg-amber-50 text-amber-900"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          {isCritical ? (
            <ShieldAlert className="mt-0.5 h-4 w-4" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4" />
          )}
          <div>
            <p>{health.message}</p>
            <Link href={detailsHref} className="mt-1 inline-block underline">
              View governance and analytics details
            </Link>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss vault health banner"
          onClick={() => {
            sessionStorage.setItem(
              "vault-health-banner-dismissed-load-id",
              getLoadId()
            );
            setDismissed(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
