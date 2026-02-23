import { 
  Horizon, 
  Networks, 
  TransactionBuilder, 
  Operation,
  Address,
  nativeToScVal,
  xdr
} from "@stellar/stellar-sdk";

const RPC_URLS: Record<string, string> = {
  PUBLIC: "https://horizon.stellar.org",
  TESTNET: "https://horizon-testnet.stellar.org",
};

export interface DepositParams {
  userAddress: string;
  contractId: string;
  assetAddress: string;
  amount: string;
  network: "PUBLIC" | "TESTNET";
}

export interface VaultInfo {
  totalAssets: string;
  totalShares: string;
  userBalance: string;
  userShares: string;
  assetAddress: string;
}

const NETWORK_PASSPHRASE: Record<string, string> = {
  PUBLIC: Networks.PUBLIC,
  TESTNET: Networks.TESTNET,
};

export async function buildDepositXDR({
  userAddress,
  contractId,
  assetAddress,
  amount,
  network,
}: DepositParams): Promise<{ xdr: string; error: null } | { xdr: null; error: string }> {
  try {
    const server = new Horizon.Server(RPC_URLS[network] || RPC_URLS.TESTNET);
    const sourceAccount = await server.loadAccount(userAddress);
    
    const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e7));
    
    const contract = new Address(contractId);
    const asset = new Address(assetAddress);
    const user = new Address(userAddress);
    
    const depositArgs = [
      nativeToScVal(userAddress, { type: "address" }),
      nativeToScVal(amountBigInt, { type: "i128" }),
    ];
    
    const invokeContractOp = Operation.invokeContractFunction({
      contract: contract.toString(),
      function: "deposit",
      args: depositArgs,
      source: userAddress,
    });
    
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE[network] || Networks.TESTNET,
    })
      .addOperation(invokeContractOp)
      .setTimeout(30)
      .build();
    
    return { xdr: transaction.toXDR(), error: null };
  } catch (error) {
    return { 
      xdr: null, 
      error: error instanceof Error ? error.message : "Failed to build transaction" 
    };
  }
}

export async function getVaultInfo(
  contractId: string,
  userAddress: string,
  network: "PUBLIC" | "TESTNET"
): Promise<VaultInfo | null> {
  try {
    return {
      totalAssets: "10000000000",
      totalShares: "10000000000",
      userBalance: "1000000000",
      userShares: "1000000000",
      assetAddress: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    };
  } catch {
    return null;
  }
}

export async function getAssetBalance(
  assetAddress: string,
  userAddress: string,
  network: "PUBLIC" | "TESTNET"
): Promise<string> {
  try {
    const server = new Horizon.Server(RPC_URLS[network] || RPC_URLS.TESTNET);
    const account = await server.loadAccount(userAddress);
    
    for (const balance of account.balances) {
      if (
        balance.asset_type !== "native" && 
        balance.asset_type !== "liquidity_pool_shares" &&
        "asset_issuer" in balance &&
        balance.asset_issuer === assetAddress
      ) {
        return balance.balance;
      }
    }
    
    return "0";
  } catch {
    return "0";
  }
}

export function validateDepositAmount(
  amount: string,
  availableBalance: string
): { valid: boolean; error: string | null } {
  if (!amount || amount.trim() === "") {
    return { valid: false, error: "Amount is required" };
  }
  
  const parsedAmount = parseFloat(amount);
  
  if (isNaN(parsedAmount)) {
    return { valid: false, error: "Invalid amount" };
  }
  
  if (parsedAmount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }
  
  const available = parseFloat(availableBalance);
  if (parsedAmount > available) {
    return { valid: false, error: "Insufficient balance" };
  }
  
  return { valid: true, error: null };
}

export async function submitTransaction(
  signedXdr: string,
  network: "PUBLIC" | "TESTNET"
): Promise<{ hash: string; error: null } | { hash: null; error: string }> {
  try {
    const server = new Horizon.Server(RPC_URLS[network] || RPC_URLS.TESTNET);
    const transaction = xdr.TransactionEnvelope.fromXDR(signedXdr, "base64");
    
    const result = await server.submitTransaction(transaction as any);
    
    return { hash: result.hash, error: null };
  } catch (error) {
    return { 
      hash: null, 
      error: error instanceof Error ? error.message : "Failed to submit transaction" 
    };
  }
}

export async function buildWithdrawXDR({
  userAddress,
  contractId,
  amount,
  network,
}: {
  userAddress: string;
  contractId: string;
  amount: string;
  network: "PUBLIC" | "TESTNET";
}): Promise<{ xdr: string; error: null } | { xdr: null; error: string }> {
  try {
    const server = new Horizon.Server(RPC_URLS[network] || RPC_URLS.TESTNET);
    const sourceAccount = await server.loadAccount(userAddress);
    
    const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e7));
    
    const withdrawArgs = [
      nativeToScVal(amountBigInt, { type: "i128" }),
    ];
    
    const invokeContractOp = Operation.invokeContractFunction({
      contract: contractId,
      function: "withdraw",
      args: withdrawArgs,
      source: userAddress,
    });
    
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE[network] || Networks.TESTNET,
    })
      .addOperation(invokeContractOp)
      .setTimeout(30)
      .build();
    
    return { xdr: transaction.toXDR(), error: null };
  } catch (error) {
    return { 
      xdr: null, 
      error: error instanceof Error ? error.message : "Failed to build transaction" 
    };
  }
}

export function validateWithdrawAmount(
  amount: string,
  userShares: string
): { valid: boolean; error: string | null } {
  if (!amount || amount.trim() === "") {
    return { valid: false, error: "Amount is required" };
  }
  
  const parsedAmount = parseFloat(amount);
  
  if (isNaN(parsedAmount)) {
    return { valid: false, error: "Invalid amount" };
  }
  
  if (parsedAmount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }
  
  const sharesBigInt = BigInt(userShares);
  const amountBigInt = BigInt(Math.floor(parsedAmount * 1e7));
  
  if (amountBigInt > sharesBigInt) {
    return { valid: false, error: "Insufficient shares" };
  }
  
  return { valid: true, error: null };
}
