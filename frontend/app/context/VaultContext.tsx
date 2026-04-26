"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/* ── Types ───────────────────────────────────────────── */
interface PendingTransaction {
  id: string;
  type: "deposit" | "withdraw";
  amount: string;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
  hash?: string;
}

interface VaultContextValue {
  /** Current vault metrics (from chain) */
  balance: string;
  shares: string;
  /** Pending transactions not yet confirmed */
  pendingTxs: PendingTransaction[];
  /** Optimistic balance shown in UI (includes pending deposits/withdrawals) */
  optimisticBalance: number;
  /** Optimistic shares shown in UI */
  optimisticShares: number;
  /** Whether there are pending transactions */
  hasPending: boolean;
  /** Add a pending deposit (optimistic update) */
  addPendingDeposit: (amount: string) => string;
  /** Add a pending withdrawal (optimistic update) */
  addPendingWithdraw: (amount: string) => string;
  /** Confirm a pending transaction */
  confirmTx: (id: string, hash: string) => void;
  /** Fail a pending transaction */
  failTx: (id: string) => void;
  /** Update base metrics from chain */
  updateMetrics: (balance: string, shares: string) => void;
}

const VaultContext = createContext<VaultContextValue | undefined>(undefined);

/* ── Provider ────────────────────────────────────────── */
export function VaultProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<string>("0");
  const [shares, setShares] = useState<string>("0");
  const [pendingTxs, setPendingTxs] = useState<PendingTransaction[]>([]);

  const baseBalance = parseFloat(balance) / 1e7;
  const baseShares = parseFloat(shares) / 1e7;

  const optimisticBalance = pendingTxs.reduce((acc, tx) => {
    if (tx.status === "pending") {
      const amt = parseFloat(tx.amount);
      return tx.type === "deposit" ? acc + amt : acc - amt;
    }
    return acc;
  }, baseBalance);

  const optimisticShares = pendingTxs.reduce((acc, tx) => {
    if (tx.status === "pending") {
      const amt = parseFloat(tx.amount);
      return tx.type === "deposit" ? acc + amt : acc - amt;
    }
    return acc;
  }, baseShares);

  const addPendingDeposit = useCallback((amount: string): string => {
    const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPendingTxs((prev) => [
      ...prev,
      {
        id,
        type: "deposit",
        amount,
        timestamp: Date.now(),
        status: "pending",
      },
    ]);
    return id;
  }, []);

  const addPendingWithdraw = useCallback((amount: string): string => {
    const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPendingTxs((prev) => [
      ...prev,
      {
        id,
        type: "withdraw",
        amount,
        timestamp: Date.now(),
        status: "pending",
      },
    ]);
    return id;
  }, []);

  const confirmTx = useCallback((id: string, hash: string) => {
    setPendingTxs((prev) =>
      prev.map((tx) =>
        tx.id === id ? { ...tx, status: "confirmed" as const, hash } : tx
      )
    );
    // Remove confirmed txs after a short delay
    setTimeout(() => {
      setPendingTxs((prev) => prev.filter((tx) => tx.id !== id));
    }, 3000);
  }, []);

  const failTx = useCallback((id: string) => {
    setPendingTxs((prev) =>
      prev.map((tx) =>
        tx.id === id ? { ...tx, status: "failed" as const } : tx
      )
    );
    // Remove failed txs after a short delay
    setTimeout(() => {
      setPendingTxs((prev) => prev.filter((tx) => tx.id !== id));
    }, 5000);
  }, []);

  const updateMetrics = useCallback((newBalance: string, newShares: string) => {
    setBalance(newBalance);
    setShares(newShares);
  }, []);

  const hasPending = pendingTxs.some((tx) => tx.status === "pending");

  return (
    <VaultContext.Provider
      value={{
        balance,
        shares,
        pendingTxs,
        optimisticBalance,
        optimisticShares,
        hasPending,
        addPendingDeposit,
        addPendingWithdraw,
        confirmTx,
        failTx,
        updateMetrics,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

/* ── Hook ────────────────────────────────────────────── */
export function useVault(): VaultContextValue {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error("useVault must be used within a <VaultProvider>");
  }
  return context;
}
