import { 
  Horizon, 
  Networks, 
  TransactionBuilder, 
  Operation,
  Address,
  nativeToScVal,
  xdr,
  Contract,
  rpc,
} from "@stellar/stellar-sdk";

export enum NetworkType {
  MAINNET = "mainnet",
  TESTNET = "testnet",
  FUTURENET = "futurenet",
}

const RPC_URLS: Record<NetworkType, string> = {
  [NetworkType.MAINNET]: "https://horizon.stellar.org",
  [NetworkType.TESTNET]: "https://horizon-testnet.stellar.org",
  [NetworkType.FUTURENET]: "https://horizon-futurenet.stellar.org",
};

export interface VaultMetrics {
  totalAssets: string;
  totalShares: string;
  sharePrice: string;
  userBalance: string;
  userShares: string;
  assetSymbol: string;
}

export interface VaultData {
  totalAssets: string;
  totalShares: string;
}

const NETWORK_PASSPHRASE: Record<NetworkType, string> = {
  [NetworkType.MAINNET]: Networks.PUBLIC,
  [NetworkType.TESTNET]: Networks.TESTNET,
  [NetworkType.FUTURENET]: "Test SDF Future Network ; October 2022",
};

export function getNetworkPassphrase(network: NetworkType): string {
  return NETWORK_PASSPHRASE[network];
}

export async function fetchVaultData(
  contractId: string,
  userAddress: string | null,
  network: NetworkType
): Promise<VaultMetrics> {
  // Mock data implementation for now
  try {
    return {
      totalAssets: "10000000000",
      totalShares: "10000000000",
      sharePrice: "1.0000000",
      userBalance: userAddress ? "1000000000" : "0",
      userShares: userAddress ? "1000000000" : "0",
      assetSymbol: "USDC",
    };
  } catch {
    return {
      totalAssets: "0",
      totalShares: "0",
      sharePrice: "0",
      userBalance: "0",
      userShares: "0",
      assetSymbol: "USDC",
    };
  }
}

export interface ReferralData {
  totalReferrals: number;
  activeStakers: number;
  totalEarnings: string;
  pendingEarnings: string;
  recentRewards: {
    address: string;
    activity: string;
    reward: string;
    date: string;
  }[];
}

export async function fetchReferralData(
  userAddress: string | null
): Promise<ReferralData> {
  // Mock data
  return {
    totalReferrals: 12,
    activeStakers: 8,
    totalEarnings: "1250.50",
    pendingEarnings: "45.20",
    recentRewards: [
      {
        address: "GABCD...WXYZ",
        activity: "Deposited 500 USDC",
        reward: "2.50 USDC",
        date: "2026-02-22",
      },
      {
        address: "GCDEF...PQRS",
        activity: "Staking Reward Claimed",
        reward: "1.25 USDC",
        date: "2026-02-21",
      },
    ],
  };
}

export function calculateSharePrice(totalAssets: string, totalShares: string): string {
  const assets = BigInt(totalAssets || "0");
  const shares = BigInt(totalShares || "0");
  
  if (shares === BigInt(0)) {
    return "1.0000000";
  }
  
  const pricePerShare = (assets * BigInt(1e7)) / shares;
  const price = Number(pricePerShare) / 1e7;
  
  return price.toFixed(7);
}

export function convertStroopsToDisplay(stroops: string): string {
  const value = BigInt(stroops || "0");
  const display = Number(value / BigInt(1e7));
  return display.toFixed(7);
}

export async function buildDepositXdr(
  contractId: string,
  userAddress: string,
  amount: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<string> {
  const horizonUrl = RPC_URLS[network];
  const server = new Horizon.Server(horizonUrl);
  const source = await server.loadAccount(userAddress);

  const passphrase = NETWORK_PASSPHRASE[network];

  const contract = new Contract(contractId);
  
  const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e7)).toString();
  
  const depositParams = [
    new Address(userAddress).toScVal(),
    nativeToScVal(amountBigInt, { type: "i128" })
  ];

  const transaction = new TransactionBuilder(source, {
    fee: "100",
    networkPassphrase: passphrase,
  })
    .addOperation(contract.call("deposit", ...depositParams))
    .setTimeout(300)
    .build();

  return transaction.toXDR();
}

export async function buildWithdrawXdr(
  contractId: string,
  userAddress: string,
  shares: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<string> {
  const horizonUrl = RPC_URLS[network];
  const server = new Horizon.Server(horizonUrl);
  const source = await server.loadAccount(userAddress);

  const passphrase = NETWORK_PASSPHRASE[network];

  const contract = new Contract(contractId);
  
  const sharesBigInt = BigInt(Math.floor(parseFloat(shares) * 1e7)).toString();
  
  const withdrawParams = [
    new Address(userAddress).toScVal(),
    nativeToScVal(sharesBigInt, { type: "i128" })
  ];

  const transaction = new TransactionBuilder(source, {
    fee: "100",
    networkPassphrase: passphrase,
  })
    .addOperation(contract.call("withdraw", ...withdrawParams))
    .setTimeout(300)
    .build();

  return transaction.toXDR();
}

export async function simulateAndAssembleTransaction(
  xdrString: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<{ result: string | null; error: string | null }> {
  try {
    const rpcUrl = network === NetworkType.MAINNET 
      ? "https://rpc.mainnet.stellar.org"
      : network === NetworkType.FUTURENET
        ? "https://rpc-futurenet.stellar.org"
        : "https://rpc.testnet.stellar.org";
    
    const server = new rpc.Server(rpcUrl);
    const passphrase = NETWORK_PASSPHRASE[network];

    const transaction = TransactionBuilder.fromXDR(xdrString, passphrase);
    
    const simulated = await server.simulateTransaction(transaction);
    
    if (!("error" in simulated)) {
      const assembled = rpc.assembleTransaction(transaction, simulated);
      return { result: assembled.build().toXDR(), error: null };
    }

    return { result: null, error: "Simulation failed" };
  } catch (error) {
    return { 
      result: null, 
      error: error instanceof Error ? error.message : "Failed to assemble transaction" 
    };
  }
}

export async function submitTransaction(
  signedXdr: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<{ hash: string | null; error: string | null }> {
  try {
    const rpcUrl = network === NetworkType.MAINNET 
      ? "https://rpc.mainnet.stellar.org"
      : network === NetworkType.FUTURENET
        ? "https://rpc-futurenet.stellar.org"
        : "https://rpc.testnet.stellar.org";
    
    const server = new rpc.Server(rpcUrl);
    const passphrase = NETWORK_PASSPHRASE[network];
    
    const transaction = TransactionBuilder.fromXDR(
      signedXdr,
      passphrase
    );
    
    const response = await server.sendTransaction(transaction);
    
    if (response.status === "PENDING" || response.status === "DUPLICATE") {
      return { hash: response.hash, error: null };
    }
    
    return { hash: null, error: "Transaction failed" };
  } catch (error) {
    return { 
      hash: null, 
      error: error instanceof Error ? error.message : "Failed to submit transaction" 
    };
  }
}
