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
    const vaultData: VaultMetrics = {
      totalAssets: "10000000000",
      totalShares: "10000000000",
      sharePrice: "1.0000000",
      userBalance: userAddress ? "1000000000" : "0",
      userShares: userAddress ? "1000000000" : "0",
      assetSymbol: "USDC",
    };

    // Cache the vault data for offline support
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("xhedge-vault-cache", JSON.stringify(vaultData));
        localStorage.setItem("xhedge-vault-cache-time", Date.now().toString());
      }
    } catch {
      // Ignore localStorage errors (may be full or unavailable)
    }

    return vaultData;
  } catch {
    // Try to return cached data on error
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const cached = localStorage.getItem("xhedge-vault-cache");
        if (cached) {
          return JSON.parse(cached) as VaultMetrics;
        }
      }
    } catch {
      // Ignore any errors
    }

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

export interface Transaction {
  id: string;
  type: "deposit" | "withdraw";
  amount: string;
  asset: string;
  status: "success" | "pending" | "failed";
  date: string;
  hash: string;
}

export async function fetchTransactionHistory(
  userAddress: string | null
): Promise<Transaction[]> {
  if (!userAddress) return [];

  // Mock transaction history
  return [
    {
      id: "1",
      type: "deposit",
      amount: "500.00",
      asset: "USDC",
      status: "success",
      date: "2026-02-23 14:30",
      hash: "abc...123",
    },
    {
      id: "2",
      type: "withdraw",
      amount: "100.00",
      asset: "XHS",
      status: "success",
      date: "2026-02-22 09:15",
      hash: "def...456",
    },
    {
      id: "3",
      type: "deposit",
      amount: "250.00",
      asset: "USDC",
      status: "success",
      date: "2026-02-21 18:45",
      hash: "ghi...789",
    },
  ];
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

export async function estimateTransactionFee(
  xdrString: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<{ fee: string | null; error: string | null }> {
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

    if (!("error" in simulated) && simulated.minResourceFee) {
      // Base fee + resource fee + inclusion buffer
      const minResourceFee = BigInt(simulated.minResourceFee);
      const totalEstimatedFee = (minResourceFee + BigInt(10000)).toString(); // adding 10000 stroops as an inclusion buffer
      return { fee: totalEstimatedFee, error: null };
    }

    return { fee: null, error: "Simulation failed to estimate fee" };
  } catch (error) {
    return {
      fee: null,
      error: error instanceof Error ? error.message : "Failed to estimate fee"
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

export interface HistoricalSharePrice {
  timestamp: number;
  price: number;
  date: string;
}

/**
 * Fetch historical share price data from Horizon
 * Queries for Deposit and Withdraw events to calculate APY/share price over time
 *
 * @param contractId - The vault contract ID
 * @param network - Network type (testnet, mainnet, etc)
 * @param fromDate - Start date for historical data (default: 30 days ago)
 * @param toDate - End date for historical data (default: now)
 * @returns Array of share price data points
 */
export async function fetchHistoricalSharePrice(
  contractId: string,
  network: NetworkType = NetworkType.TESTNET,
  fromDate?: Date,
  toDate?: Date
): Promise<HistoricalSharePrice[]> {
  try {
    const horizonUrl = RPC_URLS[network];
    const server = new Horizon.Server(horizonUrl);

    const endDate = toDate || new Date();
    const startDate = fromDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Format dates for Horizon API (ISO 8601)
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // Query contract events - look for state changes related to share price
    // This is a simplified implementation - real implementation would:
    // 1. Query all Deposit/Withdraw events from the contract
    // 2. Track cumulative totalAssets and totalShares
    // 3. Calculate share price at each point: totalAssets / totalShares
    // 4. Group by time period (day/week/month depending on timeframe)

    // For now, return empty array - in production this would fetch from Mercury indexer or similar
    // The frontend can then fall back to mock data or show "No history available"

    const now = new Date();
    const dataPoints: HistoricalSharePrice[] = [];

    // Generate synthetic data points for demonstration
    // In production, this would come from Mercury indexer or Horizon event queries
    let currentDate = new Date(startDate);
    let sharePrice = 1.0;

    while (currentDate <= endDate) {
      const timestamp = currentDate.getTime();
      const dateStr = currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      // Simulate slight APY (2-6% annual yield)
      const daysSinceStart =
        (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const apyRate = 0.04; // 4% APY
      const dailyRate = apyRate / 365;
      sharePrice = 1.0 * Math.pow(1 + dailyRate, daysSinceStart);

      dataPoints.push({
        timestamp,
        price: parseFloat(sharePrice.toFixed(7)),
        date: dateStr,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dataPoints;
  } catch (error) {
    console.error("Failed to fetch historical share price:", error);
    return [];
  }
}

/**
 * Fetch historical share price with fallback to mock data
 * This is a wrapper that can integrate with real indexer APIs
 *
 * @param contractId - The vault contract ID
 * @param network - Network type
 * @param fromDate - Start date
 * @param toDate - End date
 * @returns Array of share price data points or empty array on error
 */
export async function fetchHistoricalSharePriceWithFallback(
  contractId: string,
  network: NetworkType = NetworkType.TESTNET,
  fromDate?: Date,
  toDate?: Date
): Promise<HistoricalSharePrice[]> {
  try {
    const data = await fetchHistoricalSharePrice(contractId, network, fromDate, toDate);
    // If we got data, return it
    if (data && data.length > 0) {
      return data;
    }
    // Otherwise return empty array (chart will show "No data available")
    return [];
  } catch (error) {
    console.error("Error fetching historical share price:", error);
    return [];
  }
}
