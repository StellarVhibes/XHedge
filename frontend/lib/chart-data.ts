import { Timeframe } from '@/components/TimeframeFilter';
import { fetchHistoricalSharePriceWithFallback, NetworkType } from './stellar';

export interface DataPoint {
  date: string;
  apy: number;
}

/**
 * Convert share price historical data to APY data
 * APY is calculated as (current price / initial price)^(365/days) - 1
 */
export function convertSharePricesToAPY(prices: Array<{ date: string; price: number }>): DataPoint[] {
  if (prices.length < 2) return [];

  const initialPrice = prices[0].price;
  const dataPoints: DataPoint[] = [];

  prices.forEach((point, index) => {
    const daysPassed = index; // Approximation - each point is roughly a day
    if (daysPassed === 0) {
      dataPoints.push({ date: point.date, apy: 0 });
      return;
    }

    // Calculate annualized APY: ((current / initial)^(365 / days) - 1) * 100
    const priceRatio = point.price / initialPrice;
    const daysInYear = 365;
    const apy = (Math.pow(priceRatio, daysInYear / daysPassed) - 1) * 100;

    dataPoints.push({
      date: point.date,
      apy: Math.max(0, parseFloat(apy.toFixed(2))), // Clamp to 0 minimum
    });
  });

  return dataPoints;
}

/**
 * Calculate date range based on timeframe
 */
function getDateRange(timeframe: Timeframe): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();

  switch (timeframe) {
    case '1D':
      from.setDate(to.getDate() - 1);
      break;
    case '1W':
      from.setDate(to.getDate() - 7);
      break;
    case '1M':
      from.setDate(to.getDate() - 30);
      break;
    case '3M':
      from.setDate(to.getDate() - 90);
      break;
    case '1Y':
      from.setFullYear(to.getFullYear() - 1);
      break;
  }

  return { from, to };
}

/**
 * Fetch APY data from real historical share prices
 * Falls back to empty data if no history is available
 */
export async function fetchApyData(
  timeframe: Timeframe,
  contractId?: string,
  network: NetworkType = NetworkType.TESTNET
): Promise<DataPoint[]> {
  try {
    if (!contractId) {
      // If no contract ID, return empty array (chart will show "No data available")
      return [];
    }

    const { from, to } = getDateRange(timeframe);
    const historicalPrices = await fetchHistoricalSharePriceWithFallback(
      contractId,
      network,
      from,
      to
    );

    if (!historicalPrices || historicalPrices.length === 0) {
      // No history available - return empty array instead of mock data
      return [];
    }

    // Convert share prices to APY
    const apyData = convertSharePricesToAPY(
      historicalPrices.map((hp) => ({
        date: hp.date,
        price: hp.price,
      }))
    );

    return apyData;
  } catch (error) {
    console.error('Failed to fetch APY data:', error);
    // Return empty array instead of mock data on error
    return [];
  }
}
