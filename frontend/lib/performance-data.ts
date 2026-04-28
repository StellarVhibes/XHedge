import { getNetworkPassphrase, VAULT_CONTRACT_ID } from './stellar';

export interface HeatmapDataPoint {
  date: string;
  return: number;
}

/**
 * Fetches daily share price history for the performance heatmap
 * @param network - The Stellar network to use
 * @param years - Number of years of history to fetch (default: 3)
 * @returns Promise<HeatmapDataPoint[]> - Array of daily return data
 */
export async function fetchSharePriceHistory(
  network: string,
  years: number = 3
): Promise<HeatmapDataPoint[]> {
  try {
    const passphrase = getNetworkPassphrase(network);
    
    // In a real implementation, this would call the smart contract
    // For now, we'll generate mock data for demonstration
    const mockData = generateMockSharePriceHistory(years);
    return mockData;
  } catch (error) {
    console.error('Failed to fetch share price history:', error);
    throw new Error('Failed to fetch share price history');
  }
}

/**
 * Generates mock share price history data for demonstration
 * @param years - Number of years to generate data for
 * @returns Array of mock daily return data
 */
function generateMockSharePriceHistory(years: number): HeatmapDataPoint[] {
  const data: HeatmapDataPoint[] = [];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - years);
  
  let currentSharePrice = 100; // Starting share price
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Skip weekends (no trading)
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      // Generate random daily return between -3% and +3%
      const dailyReturn = (Math.random() - 0.5) * 6; // -3% to +3%
      
      data.push({
        date: currentDate.toISOString().split('T')[0],
        return: dailyReturn
      });
      
      // Update share price for next day
      currentSharePrice *= (1 + dailyReturn / 100);
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}

/**
 * Calculates daily returns from share price data
 * @param sharePrices - Array of { date, price } objects
 * @returns Array of daily return data
 */
export function calculateDailyReturns(
  sharePrices: Array<{ date: string; price: number }>
): HeatmapDataPoint[] {
  const returns: HeatmapDataPoint[] = [];
  
  for (let i = 1; i < sharePrices.length; i++) {
    const previousPrice = sharePrices[i - 1].price;
    const currentPrice = sharePrices[i].price;
    const dailyReturn = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    returns.push({
      date: sharePrices[i].date,
      return: dailyReturn
    });
  }
  
  return returns;
}

/**
 * Fetches share price data from the smart contract
 * @param network - The Stellar network to use
 * @param startDate - Start date for the data range
 * @param endDate - End date for the data range
 * @returns Promise<Array<{ date: string; price: number }>> - Array of share price data
 */
export async function fetchSharePriceData(
  network: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: string; price: number }>> {
  try {
    const passphrase = getNetworkPassphrase(network);
    
    // In a real implementation, this would call the smart contract's get_share_price_history function
    // For now, we'll generate mock data
    return generateMockSharePriceData(startDate, endDate);
  } catch (error) {
    console.error('Failed to fetch share price data:', error);
    throw new Error('Failed to fetch share price data');
  }
}

/**
 * Generates mock share price data for demonstration
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of mock share price data
 */
function generateMockSharePriceData(
  startDate: Date,
  endDate: Date
): Array<{ date: string; price: number }> {
  const data: Array<{ date: string; price: number }> = [];
  let currentPrice = 100; // Starting price
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      // Generate small price changes
      const priceChange = (Math.random() - 0.5) * 2; // -1 to +1
      currentPrice = Math.max(currentPrice + priceChange, 1); // Ensure price doesn't go below 1
      
      data.push({
        date: currentDate.toISOString().split('T')[0],
        price: currentPrice
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}
