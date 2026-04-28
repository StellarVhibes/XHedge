"use client";

import React from "react";
import { Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react";
import type { ConnectionStatus } from "@/hooks/use-realtime-vault";

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  reconnectAttempts?: number;
  /** Optional className to customise outer element */
  className?: string;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; colorClass: string; Icon: React.ElementType; spin?: boolean }
> = {
  connecting: {
    label: "Connecting",
    colorClass: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    Icon: Loader2,
    spin: true,
  },
  connected: {
    label: "Live",
    colorClass: "bg-green-500/10 text-green-500 border border-green-500/20",
    Icon: Wifi,
  },
  reconnecting: {
    label: "Reconnecting",
    colorClass: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    Icon: RefreshCw,
    spin: true,
  },
  disconnected: {
    label: "Disconnected",
    colorClass: "bg-red-500/10 text-red-400 border border-red-500/20",
    Icon: WifiOff,
  },
};

/**
 * ConnectionStatusIndicator
 *
 * Compact badge that reflects the current real-time connection state.
 * Shows a spinner when connecting / reconnecting, a Wifi icon when live,
 * and a WifiOff icon when disconnected.
 */
export function ConnectionStatusIndicator({
  status,
  reconnectAttempts,
  className = "",
}: ConnectionStatusIndicatorProps) {
  const { label, colorClass, Icon, spin } = STATUS_CONFIG[status];

  const showAttempts =
    status === "reconnecting" && reconnectAttempts !== undefined && reconnectAttempts > 0;

  return (
    <div
      id="connection-status-indicator"
      data-status={status}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${colorClass} ${className}`}
      title={`Real-time connection: ${label}${showAttempts ? ` (attempt ${reconnectAttempts})` : ""}`}
    >
      <Icon className={`h-3 w-3 shrink-0 ${spin ? "animate-spin" : ""}`} />
      <span>
        {label}
        {showAttempts ? ` (${reconnectAttempts})` : ""}
      </span>
    </div>
  );
}
