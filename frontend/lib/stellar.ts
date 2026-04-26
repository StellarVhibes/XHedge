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
  scValToNative,
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

const SOROBAN_RPC_URLS: Record<NetworkType, string> = {
  [NetworkType.MAINNET]: "https://rpc.mainnet.stellar.org",
  [NetworkType.TESTNET]: "https://rpc.testnet.stellar.org",
  [NetworkType.FUTURENET]: "https://rpc-futurenet.stellar.org",
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
    const endDate = toDate || new Date();
    const startDate = fromDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rpcUrl = SOROBAN_RPC_URLS[network];
    const server = new rpc.Server(rpcUrl);

    const latestLedger = await server.getLatestLedger();

    const nowMs = Date.now();
    const avgLedgerCloseMs = 5_000;
    const ledgersAgo = Math.ceil((nowMs - startDate.getTime()) / avgLedgerCloseMs);
    const maxLedgerRange = 200_000;

    const estimatedStartLedger = Math.max(1, latestLedger.sequence - ledgersAgo);
    const earliestAllowedLedger = Math.max(1, latestLedger.sequence - maxLedgerRange);
    let startLedger = Math.max(estimatedStartLedger, earliestAllowedLedger);

    const rawPoints: Array<{ timestamp: number; price: number }> = [];

    while (startLedger <= latestLedger.sequence) {
      const resp = await server.getEvents({
        startLedger,
        filters: [
          {
            type: "contract",
            contractIds: [contractId],
          },
        ],
      } as any);

      const events = resp?.events || [];
      if (events.length === 0) {
        break;
      }

      let maxSeenLedger = startLedger;

      for (const e of events) {
        maxSeenLedger = Math.max(maxSeenLedger, Number(e.ledger));

        const closedAt = e.ledgerClosedAt ? Date.parse(e.ledgerClosedAt) : NaN;
        const timestamp = Number.isFinite(closedAt) ? closedAt : Date.now();
        if (timestamp < startDate.getTime() || timestamp > endDate.getTime()) {
          continue;
        }

        let eventName: string | null = null;
        try {
          eventName = String(scValToNative(e.topic?.[0]));
        } catch {
          eventName = null;
        }

        if (eventName !== "Deposit" && eventName !== "Withdraw") {
          continue;
        }

        let nativeValue: any;
        try {
          nativeValue = scValToNative(e.value);
        } catch {
          continue;
        }

        const tuple = Array.isArray(nativeValue) ? nativeValue : null;
        const sharePriceScaled =
          eventName === "Deposit" ? tuple?.[2] : tuple?.[1];

        if (sharePriceScaled === undefined || sharePriceScaled === null) {
          continue;
        }

        let sharePriceBigInt: bigint | null = null;
        try {
          if (typeof sharePriceScaled === "bigint") {
            sharePriceBigInt = sharePriceScaled;
          } else if (typeof sharePriceScaled === "number") {
            sharePriceBigInt = BigInt(Math.trunc(sharePriceScaled));
          } else if (typeof sharePriceScaled === "string") {
            sharePriceBigInt = BigInt(sharePriceScaled);
          }
        } catch {
          sharePriceBigInt = null;
        }

        if (sharePriceBigInt === null) {
          continue;
        }

        const price = Number(sharePriceBigInt) / 1e9;
        if (!Number.isFinite(price) || price <= 0) {
          continue;
        }

        rawPoints.push({ timestamp, price });
      }

      if (maxSeenLedger <= startLedger) {
        startLedger = startLedger + 1;
      } else {
        startLedger = maxSeenLedger + 1;
      }
    }

    if (rawPoints.length === 0) {
      return [];
    }

    rawPoints.sort((a, b) => a.timestamp - b.timestamp);

    const dailyLastPoint = new Map<string, { timestamp: number; price: number }>();
    for (const p of rawPoints) {
      const d = new Date(p.timestamp);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
        d.getUTCDate()
      ).padStart(2, "0")}`;
      const existing = dailyLastPoint.get(key);
      if (!existing || existing.timestamp <= p.timestamp) {
        dailyLastPoint.set(key, p);
      }
    }

    return Array.from(dailyLastPoint.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((p) => {
        const dateStr = new Date(p.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        return {
          timestamp: p.timestamp,
          price: parseFloat(p.price.toFixed(9)),
          date: dateStr,
        };
      });
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
