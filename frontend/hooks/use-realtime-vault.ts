"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { rpc, scValToNative } from "@stellar/stellar-sdk";
import { NetworkType, useNetwork } from "@/app/context/NetworkContext";
import { getVolatilityShieldAddress } from "@/lib/contracts.config";
import { fetchVaultData, VaultMetrics } from "@/lib/stellar";

// ── Connection status ───────────────────────────────────────────────────────

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

// ── Internal constants ──────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 10_000;          // 10 s between polls
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1_000;            // 1 s → 2 → 4 → 8 → 16 (capped at 30 s)
const MAX_BACKOFF_MS = 30_000;

const SOROBAN_RPC: Record<NetworkType, string> = {
  [NetworkType.MAINNET]: "https://rpc.mainnet.stellar.org",
  [NetworkType.TESTNET]: "https://rpc.testnet.stellar.org",
  [NetworkType.FUTURENET]: "https://rpc-futurenet.stellar.org",
};

// ── Hook result ─────────────────────────────────────────────────────────────

export interface RealtimeVaultState {
  /** Latest vault metrics, or null while loading for the first time */
  metrics: VaultMetrics | null;
  /** Overall connection status of the real-time polling connection */
  status: ConnectionStatus;
  /** Number of reconnection attempts made since last successful poll */
  reconnectAttempts: number;
  /** Manually trigger a data refresh */
  refresh: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useRealtimeVault
 *
 * Polls Soroban RPC for on-chain events and keeps VaultMetrics up-to-date.
 * Implements exponential-backoff reconnection when the RPC call fails.
 *
 * @param userAddress - the connected wallet address (or null)
 */
export function useRealtimeVault(userAddress: string | null): RealtimeVaultState {
  const { network } = useNetwork();

  const [metrics, setMetrics] = useState<VaultMetrics | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Stable refs so interval callbacks don't stale-close over state
  const lastLedgerRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const refreshMetrics = useCallback(async () => {
    try {
      const data = await fetchVaultData(
        getVolatilityShieldAddress(network),
        userAddress,
        network
      );
      setMetrics(data);
    } catch {
      // Metrics refresh errors are non-fatal; the polling status tracks connectivity
    }
  }, [network, userAddress]);

  // ── core polling logic ────────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    const contractId = getVolatilityShieldAddress(network);
    const rpcUrl = SOROBAN_RPC[network];
    const server = new rpc.Server(rpcUrl);

    const pollEvents = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        // Seed the starting ledger on first run
        if (lastLedgerRef.current === null) {
          const info = await server.getLatestLedger();
          lastLedgerRef.current = info.sequence;
          isPollingRef.current = false;

          // Mark connected and reset backoff counters on first successful contact
          reconnectAttemptsRef.current = 0;
          setReconnectAttempts(0);
          setStatus("connected");
          return;
        }

        const startLedger = lastLedgerRef.current + 1;
        const response = await server.getEvents({
          startLedger,
          filters: [{ type: "contract", contractIds: [contractId] }],
        });

        // Successful response → connected
        reconnectAttemptsRef.current = 0;
        setReconnectAttempts(0);
        setStatus("connected");

        if (response.events && response.events.length > 0) {
          const maxLedger = Math.max(...response.events.map((e) => e.ledger));
          lastLedgerRef.current = maxLedger;

          const hasRelevantEvent = response.events.some((e) => {
            try {
              const topic = scValToNative(e.topic[0]);
              return ["Deposit", "Withdraw", "Rebalance"].includes(String(topic));
            } catch {
              return false;
            }
          });

          if (hasRelevantEvent) {
            await refreshMetrics();
          }
        } else {
          const info = await server.getLatestLedger();
          lastLedgerRef.current = info.sequence;
        }
      } catch (error) {
        console.error("[useRealtimeVault] Poll error:", error);

        const attempts = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = attempts;
        setReconnectAttempts(attempts);

        if (attempts >= MAX_RECONNECT_ATTEMPTS) {
          setStatus("disconnected");
          clearTimers();
        } else {
          setStatus("reconnecting");
          // Exponential backoff: 1 s, 2 s, 4 s, 8 s, 16 s (capped at 30 s)
          const backoff = Math.min(BASE_BACKOFF_MS * 2 ** (attempts - 1), MAX_BACKOFF_MS);
          clearTimers();
          reconnectTimerRef.current = setTimeout(() => {
            lastLedgerRef.current = null; // reset ledger cursor on reconnect
            startPolling();
          }, backoff);
        }
      } finally {
        isPollingRef.current = false;
      }
    };

    // Fire immediately, then on interval
    pollEvents();
    intervalRef.current = setInterval(pollEvents, POLL_INTERVAL_MS);
  }, [network, clearTimers, refreshMetrics]);

  // ── effect: start / restart when network changes ─────────────────────────

  useEffect(() => {
    setStatus("connecting");
    lastLedgerRef.current = null;
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    clearTimers();
    startPolling();
    // Initial metrics load
    refreshMetrics();

    return clearTimers;
  }, [network, userAddress]);

  // ── manual refresh ────────────────────────────────────────────────────────

  const refresh = useCallback(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  return { metrics, status, reconnectAttempts, refresh };
}
