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
  SorobanDataBuilder,
  SorobanAuthorizationEntry
} from "@stellar/stellar-sdk";

const RPC_URLS: Record<string, string> = {
  PUBLIC: "https://horizon.stellar.org",
  TESTNET: "https://horizon-testnet.stellar.org",
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

const NETWORK_PASSPHRASE: Record<string, string> = {
  PUBLIC: Networks.PUBLIC,
  TESTNET: Networks.TESTNET,
  FUTURENET: "Test SDF Future Network ; October 2022",
};

export type NetworkType = "futurenet" | "testnet" | "mainnet";

export async function fetchVaultData(
  contractId: string,
  userAddress: string | null,
  network: "PUBLIC" | "TESTNET"
): Promise<VaultMetrics> {
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
  network: NetworkType = "testnet"
): Promise<string> {
  const source = await Horizon.AccountRequest.fetch(
    RPC_URLS[network.toUpperCase()] || RPC_URLS.TESTNET,
    userAddress
  );

  const passphrase = network === "mainnet" 
    ? Networks.PUBLIC 
    : network === "futurenet" 
      ? NETWORK_PASSPHRASE.FUTURENET 
      : Networks.TESTNET;

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
  network: NetworkType = "testnet"
): Promise<string> {
  const source = await Horizon.AccountRequest.fetch(
    RPC_URLS[network.toUpperCase()] || RPC_URLS.TESTNET,
    userAddress
  );

  const passphrase = network === "mainnet" 
    ? Networks.PUBLIC 
    : network === "futurenet" 
      ? NETWORK_PASSPHRASE.FUTURENET 
      : Networks.TESTNET;

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
  network: NetworkType = "testnet"
): Promise<{ result: string | null; error: string | null }> {
  try {
    const rpcUrl = network === "mainnet" 
      ? "https://rpc.mainnet.stellar.org"
      : network === "futurenet"
        ? "https://rpc-futurenet.stellar.org"
        : "https://rpc.testnet.stellar.org";
    
    const server = new rpc.Server(rpcUrl);
    const passphrase = network === "mainnet" 
      ? Networks.PUBLIC 
      : network === "futurenet" 
        ? NETWORK_PASSPHRASE.FUTURENET 
        : Networks.TESTNET;

    const transaction = rpc.TransactionBuilder.fromXDR(xdrString, passphrase);
    
    const simulated = await server.simulateTransaction(transaction);
    
    if (rpc.SimulateTransactionResult.isSimulationSuccess(simulated)) {
      const assembled = await server.assembleTransaction(transaction, simulated);
      return { result: assembled.transaction.toXDR(), error: null };
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
  network: NetworkType = "testnet"
): Promise<{ hash: string | null; error: string | null }> {
  try {
    const rpcUrl = network === "mainnet" 
      ? "https://rpc.mainnet.stellar.org"
      : network === "futurenet"
        ? "https://rpc-futurenet.stellar.org"
        : "https://rpc.testnet.stellar.org";
    
    const server = new rpc.Server(rpcUrl);
    
    const transaction = rpc.TransactionBuilder.fromXDR(
      signedXdr,
      network === "mainnet" 
        ? Networks.PUBLIC 
        : network === "futurenet" 
          ? NETWORK_PASSPHRASE.FUTURENET 
          : Networks.TESTNET
    );
    
    const response = await server.sendTransaction(transaction);
    
    if (response.status === "PENDING" || response.status === "SUCCESS") {
      return { hash: response.hash, error: null };
    }
    
    return { hash: null, error: response.status };
  } catch (error) {
    return { 
      hash: null, 
      error: error instanceof Error ? error.message : "Failed to submit transaction" 
    };
  }
}
