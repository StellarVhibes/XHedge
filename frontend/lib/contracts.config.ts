import { NetworkType } from "@/app/context/NetworkContext";

export interface ContractAddresses {
    volatilityShield: string;
}

/**
 * Default deployed contract addresses per network.
 * These can be overridden via environment variables:
 *   NEXT_PUBLIC_VOLATILITY_SHIELD_MAINNET
 *   NEXT_PUBLIC_VOLATILITY_SHIELD_TESTNET
 *   NEXT_PUBLIC_VOLATILITY_SHIELD_FUTURENET
 *
 * Legacy single-contract override (applies to all networks if set):
 *   NEXT_PUBLIC_CONTRACT_ID
 */
const DEFAULT_ADDRESSES: Record<NetworkType, ContractAddresses> = {
    [NetworkType.MAINNET]: {
        volatilityShield:
            process.env.NEXT_PUBLIC_VOLATILITY_SHIELD_MAINNET ||
            "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    },
    [NetworkType.TESTNET]: {
        volatilityShield:
            process.env.NEXT_PUBLIC_VOLATILITY_SHIELD_TESTNET ||
            "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    },
    [NetworkType.FUTURENET]: {
        volatilityShield:
            process.env.NEXT_PUBLIC_VOLATILITY_SHIELD_FUTURENET ||
            "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    },
};

/**
 * Returns the contract addresses for the given network.
 * A legacy NEXT_PUBLIC_CONTRACT_ID env var overrides the volatilityShield
 * address on all networks when set.
 */
export function getContractAddresses(network: NetworkType): ContractAddresses {
    const addresses = DEFAULT_ADDRESSES[network];

    // Legacy single-env-var override
    if (process.env.NEXT_PUBLIC_CONTRACT_ID) {
        return {
            ...addresses,
            volatilityShield: process.env.NEXT_PUBLIC_CONTRACT_ID,
        };
    }

    return addresses;
}

/**
 * Convenience helper — returns just the volatility shield contract ID
 * for the given network.
 */
export function getVolatilityShieldAddress(network: NetworkType): string {
    return getContractAddresses(network).volatilityShield;
}
