export interface BridgeChain {
    id: string;
    name: string;
    icon?: string;
}

export interface BridgeAsset {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
    icon?: string;
    contractAddress?: string;
}

export interface BridgeTransaction {
    id: string;
    sourceChain: string;
    destinationChain: string;
    asset: string;
    amount: string;
    status: 'pending' | 'confirming' | 'completed' | 'failed';
    timestamp: string;
    txHash?: string;
}

export interface BridgeEstimation {
    fee: string;
    time: string;
    receiveAmount: string;
}

export const SUPPORTED_CHAINS: BridgeChain[] = [
    { id: '1', name: 'Ethereum' },
    { id: '56', name: 'BNB Chain' },
    { id: '137', name: 'Polygon' },
    { id: '43114', name: 'Avalanche' },
    { id: 'solana', name: 'Solana' },
    { id: 'stellar', name: 'Stellar' },
];

export const SUPPORTED_ASSETS: BridgeAsset[] = [
    { id: 'usdc', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { id: 'usdt', symbol: 'USDT', name: 'Tether', decimals: 6 },
    { id: 'xlm', symbol: 'XLM', name: 'Stellar Lumens', decimals: 7 },
];

export async function estimateBridgeTransaction(
    sourceChain: string,
    destChain: string,
    asset: string,
    amount: string
): Promise<BridgeEstimation> {
    // Simulating API call to a bridge provider like Allbridge
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (parseFloat(amount) > 100000) {
        throw new Error('Insufficient liquidity');
    }

    // Realistic estimates
    const fee = (parseFloat(amount) * 0.003 + 1.5).toFixed(2);
    const time = sourceChain === 'ethereum' ? '15-20 min' : '3-5 min';
    const receiveAmount = (parseFloat(amount) - parseFloat(fee)).toFixed(2);

    return {
        fee,
        time,
        receiveAmount,
    };
}

export async function initiateBridgeTransaction(
    sourceChain: string,
    destChain: string,
    asset: string,
    amount: string,
    address: string
): Promise<string> {
    // Simulating bridge transaction initiation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (Math.random() < 0.05) {
        throw new Error('Bridge service unavailable. Please try again later.');
    }

    return '0x' + Math.random().toString(16).slice(2, 10) + '...';
}

export function getStatusLabel(status: BridgeTransaction['status']): string {
    switch (status) {
        case 'pending': return 'Pending';
        case 'confirming': return 'Confirming';
        case 'completed': return 'Completed';
        case 'failed': return 'Failed';
        default: return status;
    }
}
