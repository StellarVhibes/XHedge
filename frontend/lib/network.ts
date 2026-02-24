import { rpc } from "@stellar/stellar-sdk";

export type NetworkType = "futurenet" | "testnet" | "mainnet";

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  passphrase: string;
  horizonUrl?: string;
}

export const NETWORKS: Record<NetworkType, NetworkConfig> = {
  futurenet: {
    name: "Futurenet",
    rpcUrl: "https://rpc-futurenet.stellar.org",
    passphrase: "Test SDF Future Network ; October 2022",
    horizonUrl: "https://horizon-futurenet.stellar.org",
  },
  testnet: {
    name: "Testnet",
    rpcUrl: "https://rpc.testnet.stellar.org",
    passphrase: "Test SDF Network ; September 2015",
    horizonUrl: "https://horizon-testnet.stellar.org",
  },
  mainnet: {
    name: "Mainnet",
    rpcUrl: "https://rpc.mainnet.stellar.org",
    passphrase: "Public Global Stellar Network ; September 2015",
    horizonUrl: "https://horizon.stellar.org",
  },
};

const DEFAULT_NETWORK: NetworkType = "futurenet";

export function getNetworkConfig(network: NetworkType = DEFAULT_NETWORK): NetworkConfig {
  return NETWORKS[network];
}

export function getProvider(network: NetworkType = DEFAULT_NETWORK): rpc.Server {
  const config = getNetworkConfig(network);
  return new rpc.Server(config.rpcUrl, {
    allowHttp: config.rpcUrl.startsWith("http://"),
  });
}

export function getHorizonUrl(network: NetworkType = DEFAULT_NETWORK): string {
  const config = getNetworkConfig(network);
  return config.horizonUrl || "";
}

export function getNetworkPassphrase(network: NetworkType = DEFAULT_NETWORK): string {
  const config = getNetworkConfig(network);
  return config.passphrase;
}
