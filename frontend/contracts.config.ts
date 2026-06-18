import { NetworkType } from "@/lib/stellar";

export const VAULT_CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ||
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

/**
 * Supported asset contract IDs (Soroban Address strings).
 *
 * These should be set per-environment. Defaults are placeholders.
 */
export const SUPPORTED_ASSETS: Record<
  NetworkType,
  { symbol: string; contractId: string }[]
> = {
  [NetworkType.MAINNET]: [
    { symbol: "USDC", contractId: process.env.NEXT_PUBLIC_USDC_MAINNET || "" },
    { symbol: "EURC", contractId: process.env.NEXT_PUBLIC_EURC_MAINNET || "" },
  ],
  [NetworkType.TESTNET]: [
    { symbol: "USDC", contractId: process.env.NEXT_PUBLIC_USDC_TESTNET || "" },
    { symbol: "EURC", contractId: process.env.NEXT_PUBLIC_EURC_TESTNET || "" },
  ],
  [NetworkType.FUTURENET]: [
    { symbol: "USDC", contractId: process.env.NEXT_PUBLIC_USDC_FUTURENET || "" },
    { symbol: "EURC", contractId: process.env.NEXT_PUBLIC_EURC_FUTURENET || "" },
  ],
};

