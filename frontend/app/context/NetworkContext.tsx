"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export enum NetworkType {
  MAINNET = "mainnet",
  TESTNET = "testnet",
  FUTURENET = "futurenet",
}

interface NetworkConfig {
  network: NetworkType;
  horizonUrl: string;
  networkPassphrase: string;
}

const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  [NetworkType.MAINNET]: {
    network: NetworkType.MAINNET,
    horizonUrl: "https://horizon.stellar.org",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
  },
  [NetworkType.TESTNET]: {
    network: NetworkType.TESTNET,
    horizonUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  },
  [NetworkType.FUTURENET]: {
    network: NetworkType.FUTURENET,
    horizonUrl: "https://horizon-futurenet.stellar.org",
    networkPassphrase: "Test SDF Future Network ; October 2022",
  },
};

interface NetworkContextType {
  network: NetworkType;
  config: NetworkConfig;
  setNetwork: (network: NetworkType) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetworkState] = useState<NetworkType>(NetworkType.TESTNET);

  useEffect(() => {
    const savedNetwork = localStorage.getItem("xhedge-network") as NetworkType;
    if (savedNetwork && Object.values(NetworkType).includes(savedNetwork)) {
      setNetworkState(savedNetwork);
    }
  }, []);

  const setNetwork = useCallback((newNetwork: NetworkType) => {
    setNetworkState(newNetwork);
    localStorage.setItem("xhedge-network", newNetwork);
  }, []);

  const value = {
    network,
    config: NETWORK_CONFIGS[network],
    setNetwork,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}
