"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  RefreshCw,
  Info
} from "lucide-react";

interface PriceData {
  day: number;
  price: number;
  return: number;
}

export default function VolatilityCalculator() {
  const [prices, setPrices] = useState<string[]>(["100", "102", "98", "105", "103", "108", "106", "110", "107", "112"]);
  const [calculatedData, setCalculatedData] = useState<PriceData[]>([]);
  const [volatility, setVolatility] = useState<number | null>(null);
  const [mean, setMean] = useState<number | null>(null);

  const calculateVolatility = () => {
    const priceNumbers = prices.map(p => parseFloat(p)).filter(p => !isNaN(p));
    
    if (priceNumbers.length < 2) {
      alert("Please enter at least 2 valid prices");
      return;
    }

    // Calculate daily returns
    const returns: number[] = [];
    const data: PriceData[] = [];
    
    for (let i = 1; i < priceNumbers.length; i++) {
      const returnValue = ((priceNumbers[i] - priceNumbers[i-1]) / priceNumbers[i-1]) * 100;
      returns.push(returnValue);
      data.push({
        day: i,
        price: priceNumbers[i],
        return: returnValue
      });
    }

    // Calculate mean return
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    setMean(meanReturn);

    // Calculate standard deviation (volatility)
    const squaredDiffs = returns.map(ret => Math.pow(ret - meanReturn, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Annualize (assuming 252 trading days)
    const annualizedVolatility = stdDev * Math.sqrt(252);
    
    setCalculatedData(data);
    setVolatility(annualizedVolatility);
  };

  const handlePriceChange = (index: number, value: string) => {
    const newPrices = [...prices];
    newPrices[index] = value;
    setPrices(newPrices);
  };

  const addPriceField = () => {
    setPrices([...prices, ""]);
  };

  const removePriceField = (index: number) => {
    if (prices.length > 2) {
      const newPrices = prices.filter((_, i) => i !== index);
      setPrices(newPrices);
    }
  };

  const resetCalculator = () => {
    setPrices(["100", "102", "98", "105", "103", "108", "106", "110", "107", "112"]);
    setCalculatedData([]);
    setVolatility(null);
    setMean(null);
  };

  const getVolatilityLevel = (vol: number) => {
    if (vol < 15) return { level: "Low", color: "bg-green-100 text-green-800" };
    if (vol < 25) return { level: "Medium", color: "bg-yellow-100 text-yellow-800" };
    if (vol < 35) return { level: "High", color: "bg-orange-100 text-orange-800" };
    return { level: "Very High", color: "bg-red-100 text-red-800" };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Volatility Calculator
          </CardTitle>
          <CardDescription>
            Calculate historical volatility using price data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Price Data (Daily Closing Prices)</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addPriceField}>
                  Add Price
                </Button>
                <Button variant="outline" size="sm" onClick={resetCalculator}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {prices.map((price, index) => (
                <div key={index} className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={`Day ${index + 1}`}
                    value={price}
                    onChange={(e) => handlePriceChange(index, e.target.value)}
                    className="text-sm"
                  />
                  {prices.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                      onClick={() => removePriceField(index)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={calculateVolatility} className="w-full">
            <BarChart3 className="h-4 w-4 mr-2" />
            Calculate Volatility
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {volatility !== null && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Annualized Volatility</Label>
                  <div className="text-2xl font-bold text-blue-600">
                    {volatility.toFixed(2)}%
                  </div>
                  <Badge className={getVolatilityLevel(volatility).color}>
                    {getVolatilityLevel(volatility).level}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Average Daily Return</Label>
                  <div className="text-2xl font-bold text-green-600">
                    {mean?.toFixed(2)}%
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>Interpretation:</strong> {volatility.toFixed(2)}% annualized volatility 
                    means the asset is expected to fluctuate within approximately ±{volatility.toFixed(1)}% 
                    from its average over a year (one standard deviation).
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {calculatedData.map((data, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Day {data.day}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">${data.price.toFixed(2)}</span>
                      <div className={`flex items-center gap-1 ${
                        data.return >= 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {data.return >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(data.return).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Educational Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Understanding the Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">Low Volatility (&lt;15%)</h4>
              <p className="text-sm text-green-800">
                Stable assets like government bonds or blue-chip stocks. 
                Predictable price movements with lower risk.
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">Medium Volatility (15-25%)</h4>
              <p className="text-sm text-yellow-800">
                Typical market indices and established stocks. 
                Moderate risk with balanced returns.
              </p>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-2">High Volatility (25-35%)</h4>
              <p className="text-sm text-orange-800">
                Growth stocks, emerging markets, or commodities. 
                Higher risk with potential for greater returns.
              </p>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">Very High Volatility (&gt;35%)</h4>
              <p className="text-sm text-red-800">
                Cryptocurrencies, penny stocks, or distressed assets. 
                Extreme risk with unpredictable price movements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
