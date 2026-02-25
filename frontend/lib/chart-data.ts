import { Timeframe } from '@/components/TimeframeFilter';

export interface DataPoint {
  date: string;
  apy: number;
}

export function generateMockData(timeframe: Timeframe): DataPoint[] {
  const now = new Date();
  let dataPoints: DataPoint[] = [];
  
  switch (timeframe) {
    case '1D':
      // Hourly data for 24 hours
      dataPoints = Array.from({ length: 24 }).map((_, i) => {
        const date = new Date(now);
        date.setHours(date.getHours() - (23 - i));
        return {
          date: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          apy: 5 + Math.random() * 3 + (i * 0.05),
        };
      });
      break;
      
    case '1W':
      // Daily data for 7 days
      dataPoints = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          apy: 5 + Math.random() * 3 + (i * 0.1),
        };
      });
      break;
      
    case '1M':
      // Daily data for 30 days
      dataPoints = Array.from({ length: 30 }).map((_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          apy: 5 + Math.random() * 3 + (i * 0.1),
        };
      });
      break;
      
    case '1Y':
      // Monthly data for 12 months
      dataPoints = Array.from({ length: 12 }).map((_, i) => {
        const date = new Date(now);
        date.setMonth(date.getMonth() - (11 - i));
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          apy: 5 + Math.random() * 3 + (i * 0.2),
        };
      });
      break;
      
    default:
      dataPoints = [];
  }
  
  return dataPoints;
}
