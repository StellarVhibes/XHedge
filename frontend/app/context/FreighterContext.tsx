"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

/* ── Freighter API v2 ─────────────────────────────────── */
import {
  isConnected as freighterIsConnected,
  getPublicKey,
  isAllowed,
  setAllowed,
} from "@stellar/freighter-api";

/* ── Types ───────────────────────────────────────────── */
interface FreighterState {
  /** Whether Freighter extension is installed in the browser */
  isInstalled: boolean;
  /** Whether a wallet is currently connected */
  isConnected: boolean;
  /** The connected Stellar public key (G...) */
  publicKey: string | null;
  /** True while any async wallet operation is in progress */
  isLoading: boolean;
  /** Last error message, if any */
  error: string | null;
}

interface FreighterContextValue extends FreighterState {
  /** Prompt the user to connect their Freighter wallet */
  connect: () => Promise<void>;
  /** Disconnect (clear local state; Freighter has no revoke API) */
  disconnect: () => void;
}

const initialState: FreighterState = {
  isInstalled: false,
  isConnected: false,
  publicKey: null,
  isLoading: true,
  error: null,
};

/* ── Context ─────────────────────────────────────────── */
const FreighterContext = createContext<FreighterContextValue | undefined>(
  undefined
);

/* ── Provider ────────────────────────────────────────── */
export function FreighterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FreighterState>(initialState);

  /**
   * Check if Freighter is installed and whether it has previously
   * been authorised for this dApp.  If so, silently reconnect.
   */
  const checkConnection = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const connected = await freighterIsConnected();

      if (!connected) {
        setState((prev) => ({
          ...prev,
          isInstalled: false,
          isConnected: false,
          publicKey: null,
          isLoading: false,
        }));
        return;
      }

      // Extension is installed
      const allowed = await isAllowed();

      if (allowed) {
        // Auto-reconnect: user previously granted access
        const pubKey = await getPublicKey();
        setState({
          isInstalled: true,
          isConnected: true,
          publicKey: pubKey,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          isInstalled: true,
          isConnected: false,
          publicKey: null,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, []);

  /** Run on mount – handles auto-reconnect on refresh */
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  /* ── Actions ───────────────────────────────────────── */
  const connect = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const connected = await freighterIsConnected();
      if (!connected) {
        setState((prev) => ({
          ...prev,
          isInstalled: false,
          isLoading: false,
          error: "Freighter extension not found. Please install it.",
        }));
        return;
      }

      await setAllowed();
      const pubKey = await getPublicKey();

      setState({
        isInstalled: true,
        isConnected: true,
        publicKey: pubKey,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to connect",
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      isInstalled: true,
      isConnected: false,
      publicKey: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return (
    <FreighterContext.Provider value={{ ...state, connect, disconnect }}>
      {children}
    </FreighterContext.Provider>
  );
}

/* ── Hook ────────────────────────────────────────────── */
export function useFreighter(): FreighterContextValue {
  const context = useContext(FreighterContext);
  if (context === undefined) {
    throw new Error("useFreighter must be used within a <FreighterProvider>");
  }
  return context;
}
