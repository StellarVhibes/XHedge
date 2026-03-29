import { NextResponse } from 'next/server';

export async function GET() {
  // Mock yield breakdown data from AI engine
  const breakdown = {
    totalApy: 12.45,
    lastUpdate: new Date().toISOString(),
    sources: [
      {
        id: 'lending',
        name: 'Lending Rewards',
        value: 4.25,
        percentage: 34.1,
        color: 'hsl(var(--primary))',
        description: 'Interest earned from lending stablecoins on decentralized protocols.'
      },
      {
        id: 'staking',
        name: 'Staking APY',
        value: 3.80,
        percentage: 30.5,
        color: 'hsl(142.1 76.2% 36.3%)',
        description: 'Governance and network participation rewards.'
      },
      {
        id: 'lp_fees',
        name: 'LP Fees',
        value: 2.95,
        percentage: 23.7,
        color: 'hsl(38 92% 50%)',
        description: 'Transaction fees collected from liquidity pools.'
      },
      {
        id: 'vol_shield',
        name: 'Volatility Shield Fees',
        value: 1.45,
        percentage: 11.7,
        color: 'hsl(199 89% 48%)',
        description: 'Service fees for volatility protection layers.'
      }
    ]
  };

  return NextResponse.json(breakdown);
}
