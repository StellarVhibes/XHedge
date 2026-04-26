import {
  Horizon,
  Networks,
  TransactionBuilder,
  Operation,
  Address,
  Account,
  nativeToScVal,
  scValToNative,
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
  try {
    const rpcUrl = SOROBAN_RPC_URLS[network];
    const server = new rpc.Server(rpcUrl);
    const contract = new Contract(contractId);

    // Prepare calls
    const totalAssetsCall = contract.call("total_assets");
    const totalSharesCall = contract.call("total_shares");
    const sharePriceCall = contract.call("get_share_price");

    // Simulate for total vault metrics
    const sourceAccount = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const [totalAssetsSim, totalSharesSim, sharePriceSim] = await Promise.all([
      server.simulateTransaction(new TransactionBuilder(sourceAccount, { fee: "100", networkPassphrase: getNetworkPassphrase(network) }).addOperation(totalAssetsCall).setTimeout(30).build()),
      server.simulateTransaction(new TransactionBuilder(sourceAccount, { fee: "100", networkPassphrase: getNetworkPassphrase(network) }).addOperation(totalSharesCall).setTimeout(30).build()),
      server.simulateTransaction(new TransactionBuilder(sourceAccount, { fee: "100", networkPassphrase: getNetworkPassphrase(network) }).addOperation(sharePriceCall).setTimeout(30).build()),
    ]);

    let userShares = "0";
    if (userAddress) {
      const userBalanceCall = contract.call("balance", new Address(userAddress).toScVal());
      const userSourceAccount = new Account(userAddress, "0");
      const userBalanceSim = await server.simulateTransaction(
        new TransactionBuilder(userSourceAccount, {
          fee: "100",
          networkPassphrase: getNetworkPassphrase(network),
        })
          .addOperation(userBalanceCall)
          .setTimeout(30)
          .build()
      );

      if (rpc.Api.isSimulationSuccess(userBalanceSim) && userBalanceSim.result) {
        userShares = scValToNative(userBalanceSim.result.retval).toString();
      }
    }

    const totalAssets = (rpc.Api.isSimulationSuccess(totalAssetsSim) && totalAssetsSim.result)
      ? scValToNative(totalAssetsSim.result.retval).toString()
      : "0";
    const totalShares = (rpc.Api.isSimulationSuccess(totalSharesSim) && totalSharesSim.result)
      ? scValToNative(totalSharesSim.result.retval).toString()
      : "0";
    const sharePrice = (rpc.Api.isSimulationSuccess(sharePriceSim) && sharePriceSim.result)
      ? (Number(scValToNative(sharePriceSim.result.retval)) / 1e9).toFixed(9)
      : "1.000000000";

    const vaultData: VaultMetrics = {
      totalAssets,
      totalShares,
      sharePrice,
      userBalance: userShares, // In this vault, user balance in assets is derived from shares
      userShares,
      assetSymbol: "USDC",
    };

    // Cache the vault data for offline support
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("xhedge-vault-cache", JSON.stringify(vaultData));
        localStorage.setItem("xhedge-vault-cache-time", Date.now().toString());
      }
    } catch {
      // Ignore
    }

    return vaultData;
  } catch (error) {
    console.error("Error fetching vault data from contract:", error);
    // Fallback to mock data for development if contract call fails
    const mockData: VaultMetrics = {
      totalAssets: "10000000000",
      totalShares: "10000000000",
      sharePrice: "1.0000000",
      userBalance: userAddress ? "1000000000" : "0",
      userShares: userAddress ? "1000000000" : "0",
      assetSymbol: "USDC",
    };
    return mockData;
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
    return "1.000000000";
  }

  const pricePerShare = (assets * BigInt(1e9)) / shares;
  const price = Number(pricePerShare) / 1e9;

  return price.toFixed(9);
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
  contractId: string,
  userAddress: string | null,
  network: NetworkType = NetworkType.TESTNET
): Promise<Transaction[]> {
  if (!userAddress) return [];

  try {
    const rpcUrl = SOROBAN_RPC_URLS[network];
    const server = new rpc.Server(rpcUrl);
    const latestLedger = await server.getLatestLedger();
    const startLedger = Math.max(1, latestLedger.sequence - 20000);

    const resp = await server.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [contractId],
          topics: [
            [], // Topic 0 (event name) - empty to get all
            [new Address(userAddress).toScVal().toXDR("base64")]
          ],
        },
      ],
    } as any);

    const events = resp?.events || [];
    const transactions: Transaction[] = [];

    for (const e of events) {
      try {
        const topic0 = scValToNative(e.topic?.[0]);
        if (topic0 !== "Deposit" && topic0 !== "Withdraw") continue;

        const value = scValToNative(e.value);
        if (!Array.isArray(value)) continue;

        const date = e.ledgerClosedAt ? new Date(e.ledgerClosedAt).toISOString().replace("T", " ").split(".")[0] : "Recent";
        
        if (topic0 === "Deposit") {
          transactions.push({
            id: e.id,
            type: "deposit",
            amount: (Number(value[1]) / 1e7).toFixed(2),
            asset: "USDC", // Should ideally be resolved from asset address
            status: "success",
            date,
            hash: e.id.split("-")[0],
          });
        } else if (topic0 === "Withdraw") {
          transactions.push({
            id: e.id,
            type: "withdraw",
            amount: (Number(value[1]) / 1e7).toFixed(2), // shares in index 1 for Withdraw
            asset: "XHS",
            status: "success",
            date,
            hash: e.id.split("-")[0],
          });
        }
      } catch (err) {
        console.error("Error parsing event for history:", err);
      }
    }

    return transactions.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error("Failed to fetch real transaction history:", error);
    return [];
  }
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

const STROOPS_PER_XLM = 10_000_000;

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  approvals: number;
  threshold: number;
  executed: boolean;
  proposedAt: number;
  timelockEndsAt: number;
  status: "pending" | "approved" | "executed";
}

interface GovernanceSummary {
  guardians: string[];
  threshold: number;
  active_proposal_count: number;
}

interface BuildContractCallOptions {
  contractId: string;
  sourceAddress: string;
  method: string;
  args?: xdr.ScVal[];
  network?: NetworkType;
}

function toScaledI128(input: string): string {
  return BigInt(Math.floor(parseFloat(input) * STROOPS_PER_XLM)).toString();
}

function fromScaledValue(value: unknown, scale: number): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value / scale;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return 0;
    }
    return parsed / scale;
  }

  if (typeof value === "bigint") {
    return Number(value) / scale;
  }

  return 0;
}

function getRpcUrl(network: NetworkType): string {
  if (network === NetworkType.MAINNET) {
    return "https://rpc.mainnet.stellar.org";
  }

  if (network === NetworkType.FUTURENET) {
    return "https://rpc-futurenet.stellar.org";
  }

  return "https://rpc.testnet.stellar.org";
}

async function buildContractCallXdr({
  contractId,
  sourceAddress,
  method,
  args = [],
  network = NetworkType.TESTNET,
}: BuildContractCallOptions): Promise<string> {
  const horizonUrl = RPC_URLS[network];
  const server = new Horizon.Server(horizonUrl);
  const source = await server.loadAccount(sourceAddress);
  const contract = new Contract(contractId);

  const transaction = new TransactionBuilder(source, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE[network],
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  return transaction.toXDR();
}

async function simulateContractRead<T>(
  xdrString: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<{ result: T | null; error: string | null }> {
  try {
    const server = new rpc.Server(getRpcUrl(network));
    const passphrase = NETWORK_PASSPHRASE[network];
    const transaction = TransactionBuilder.fromXDR(xdrString, passphrase);
    const simulated = await server.simulateTransaction(transaction);

    if ("error" in simulated) {
      return { result: null, error: "Simulation failed" };
    }

    const returnValue = (simulated as any)?.result?.retval;
    if (!returnValue) {
      return { result: null, error: "No return value from simulation" };
    }

    const nativeResult = scValToNative(returnValue) as T;
    return { result: nativeResult, error: null };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : "Failed to simulate contract read",
    };
  }
}

export async function convertToShares(
  contractId: string,
  sourceAddress: string,
  amount: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<{ shares: number | null; error: string | null }> {
  try {
    const xdrString = await buildContractCallXdr({
      contractId,
      sourceAddress,
      method: "convert_to_shares",
      args: [nativeToScVal(toScaledI128(amount), { type: "i128" })],
      network,
    });

    const { result, error } = await simulateContractRead<unknown>(xdrString, network);
    if (error || result === null) {
      return { shares: null, error: error || "Failed to convert to shares" };
    }

    return { shares: fromScaledValue(result, STROOPS_PER_XLM), error: null };
  } catch (error) {
    return {
      shares: null,
      error: error instanceof Error ? error.message : "Failed to convert to shares",
    };
  }
}

export async function convertToAssets(
  contractId: string,
  sourceAddress: string,
  shares: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<{ assets: number | null; error: string | null }> {
  try {
    const xdrString = await buildContractCallXdr({
      contractId,
      sourceAddress,
      method: "convert_to_assets",
      args: [nativeToScVal(toScaledI128(shares), { type: "i128" })],
      network,
    });

    const { result, error } = await simulateContractRead<unknown>(xdrString, network);
    if (error || result === null) {
      return { assets: null, error: error || "Failed to convert to assets" };
    }

    return { assets: fromScaledValue(result, STROOPS_PER_XLM), error: null };
  } catch (error) {
    return {
      assets: null,
      error: error instanceof Error ? error.message : "Failed to convert to assets",
    };
  }
}

export async function getSharePrice(
  contractId: string,
  sourceAddress: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<{ sharePrice: number | null; error: string | null }> {
  try {
    const xdrString = await buildContractCallXdr({
      contractId,
      sourceAddress,
      method: "get_share_price",
      network,
    });

    const { result, error } = await simulateContractRead<unknown>(xdrString, network);
    if (error || result === null) {
      return { sharePrice: null, error: error || "Failed to read share price" };
    }

    return { sharePrice: fromScaledValue(result, 1_000_000_000), error: null };
  } catch (error) {
    return {
      sharePrice: null,
      error: error instanceof Error ? error.message : "Failed to get share price",
    };
  }
}

export async function getGovernanceSummary(
  contractId: string,
  sourceAddress: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<{ summary: GovernanceSummary | null; error: string | null }> {
  try {
    const xdrString = await buildContractCallXdr({
      contractId,
      sourceAddress,
      method: "get_governance_summary",
      network,
    });

    const { result, error } = await simulateContractRead<any>(xdrString, network);
    if (error || !result) {
      return { summary: null, error: error || "Failed to read governance summary" };
    }

    const guardians = Array.isArray(result.guardians)
      ? result.guardians.map((g: unknown) => String(g))
      : [];
    const threshold = Number(result.threshold || 0);
    const activeProposalCount = Number(result.active_proposal_count || 0);

    return {
      summary: {
        guardians,
        threshold,
        active_proposal_count: activeProposalCount,
      },
      error: null,
    };
  } catch (error) {
    return {
      summary: null,
      error: error instanceof Error ? error.message : "Failed to get governance summary",
    };
  }
}

export async function getProposals(
  contractId: string,
  sourceAddress: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<{ proposals: GovernanceProposal[]; error: string | null }> {
  const { summary, error } = await getGovernanceSummary(contractId, sourceAddress, network);
  if (error || !summary) {
    const now = Math.floor(Date.now() / 1000);
    return {
      proposals: [
        {
          id: "1",
          title: "Proposal #1",
          description: "Fallback proposal while governance RPC is unavailable.",
          approvals: 1,
          threshold: 2,
          executed: false,
          proposedAt: now - 600,
          timelockEndsAt: now + 3600,
          status: "pending",
        },
      ],
      error: error || "Failed to load proposals",
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const timelockSeconds = 24 * 60 * 60;

  const proposals: GovernanceProposal[] = Array.from(
    { length: Math.max(summary.active_proposal_count, 0) },
    (_, idx) => {
      const id = idx + 1;
      const approvals = Math.max(0, Math.min(summary.threshold - 1, 1 + (idx % 2)));
      const proposedAt = now - idx * 3600;
      return {
        id: String(id),
        title: `Proposal #${id}`,
        description: "On-chain governance proposal loaded from contract summary.",
        approvals,
        threshold: summary.threshold,
        executed: false,
        proposedAt,
        timelockEndsAt: proposedAt + timelockSeconds,
        status: approvals >= summary.threshold ? "approved" : "pending",
      };
    }
  );

  return { proposals, error: null };
}

export async function buildCastVoteXdr(
  contractId: string,
  userAddress: string,
  proposalId: string,
  support: boolean,
  network: NetworkType = NetworkType.TESTNET
): Promise<string> {
  return buildContractCallXdr({
    contractId,
    sourceAddress: userAddress,
    method: "cast_vote",
    args: [
      new Address(userAddress).toScVal(),
      nativeToScVal(BigInt(proposalId), { type: "u64" }),
      nativeToScVal(support),
    ],
    network,
  });
}

export async function buildProposeActionXdr(
  contractId: string,
  userAddress: string,
  title: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<string> {
  return buildContractCallXdr({
    contractId,
    sourceAddress: userAddress,
    method: "propose_action",
    args: [
      new Address(userAddress).toScVal(),
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("title"),
          val: nativeToScVal(title || "Untitled Action"),
        }),
      ]),
    ],
    network,
  });
}

export interface HistoricalSharePrice {
  timestamp: number;
  price: number;
  date: string;
}

export interface UserBasis {
  averageEntryPrice: number;
  totalSharesMinted: number;
}

/**
 * Calculates the user's weighted average entry price by fetching Deposit events.
 */
export async function fetchUserBasis(
  contractId: string,
  userAddress: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<UserBasis> {
  try {
    const rpcUrl = SOROBAN_RPC_URLS[network];
    const server = new rpc.Server(rpcUrl);
    
    // Fetch last 10000 ledgers of events
    const latestLedger = await server.getLatestLedger();
    const startLedger = Math.max(1, latestLedger.sequence - 10000);

    const resp = await server.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [contractId],
          topics: [
            [xdr.ScVal.scvSymbol("Deposit").toXDR("base64")],
            [new Address(userAddress).toScVal().toXDR("base64")]
          ],
        },
      ],
    } as any);

    const events = resp?.events || [];
    let totalValueDeposited = 0;
    let totalSharesMinted = 0;

    for (const e of events) {
      try {
        const value = scValToNative(e.value);
        if (Array.isArray(value)) {
          // Schema Deposit event value: (asset, amount, share_price, total_assets, total_shares)
          const amount = Number(value[1]) / 1e7;
          const sharePrice = Number(value[2]) / 1e9;
          const sharesMinted = amount / sharePrice;

          totalValueDeposited += amount;
          totalSharesMinted += sharesMinted;
        }
      } catch (err) {
        console.error("Error parsing deposit event:", err);
      }
    }

    // Fallback if no events found or parsing failed
    if (totalSharesMinted === 0) {
      return { averageEntryPrice: 0, totalSharesMinted: 0 };
    }

    return {
      averageEntryPrice: totalValueDeposited / totalSharesMinted,
      totalSharesMinted,
    };
  } catch (error) {
    console.error("Failed to fetch user basis:", error);
    return { averageEntryPrice: 0, totalSharesMinted: 0 };
  }
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
