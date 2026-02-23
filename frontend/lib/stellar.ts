import { 
  Horizon, 
  Networks, 
  TransactionBuilder, 
  Operation,
  xdr,
  Address,
  nativeToScVal
} from "@stellar/stellar-sdk";

const RPC_URLS: Record<string, string> = {
  PUBLIC: "https://horizon.stellar.org",
  TESTNET: "https://horizon-testnet.stellar.org",
};

export interface WithdrawParams {
  userAddress: string;
  contractId: string;
  amount: string;
  network: "PUBLIC" | "TESTNET";
}

export interface VaultInfo {
  totalAssets: string;
  totalShares: string;
  userBalance: string;
  assetAddress: string;
}

const NETWORK_PASSPHRASE: Record<string, string> = {
  PUBLIC: Networks.PUBLIC,
  TESTNET: Networks.TESTNET,
};

export async function buildWithdrawXDR({
  userAddress,
  contractId,
  amount,
  network,
}: WithdrawParams): Promise<{ xdr: string; error: null } | { xdr: null; error: string }> {
  try {
    const server = new Horizon.Server(RPC_URLS[network] || RPC_URLS.TESTNET);
    const sourceAccount = await server.loadAccount(userAddress);
    
    const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e7));
    
    const contract = new Address(contractId);
    
    const withdrawArgs = [
      nativeToScVal(amountBigInt, { type: "i128" }),
    ];
    
    const invokeContractOp = Operation.invokeContractFunction({
      contract: contract.toString(),
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
      assetAddress: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    };
  } catch {
    return null;
  }
}

export function validateWithdrawAmount(
  amount: string,
  userBalance: string
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
  
  const balanceBigInt = BigInt(userBalance);
  const amountBigInt = BigInt(Math.floor(parsedAmount * 1e7));
  
  if (amountBigInt > balanceBigInt) {
    return { valid: false, error: "Insufficient balance" };
  }
  
  return { valid: true, error: null };
}
