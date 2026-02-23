"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { NetworkType, NETWORKS, getNetworkConfig } from "@/lib/network";

interface NetworkContextValue {
  network: NetworkType;
  setNetwork: (network: NetworkType) => void;
  networkConfig: typeof NETWORKS[NetworkType];
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<NetworkType>("futurenet");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("xhedge-network") as NetworkType;
    if (saved && NETWORKS[saved]) {
      setNetworkState(saved);
    }
  }, []);

  const setNetwork = useCallback((newNetwork: NetworkType) => {
    setNetworkState(newNetwork);
    localStorage.setItem("xhedge-network", newNetwork);
    // Optional: Reload the page or trigger a global event to re-initialize providers
    // For now, React state update will trigger re-renders in components using this context
  }, []);

  const networkConfig = getNetworkConfig(network);

  return (
    <NetworkContext.Provider value={{ network, setNetwork, networkConfig }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a <NetworkProvider>");
  }
  return context;
}
