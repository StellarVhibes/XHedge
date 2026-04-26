"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Percent,
  Calculator,
  Play,
  RotateCw,
  Info
} from "lucide-react";

interface SimulationResult {
  unhedgedValue: number;
  hedgedValue: number;
  protection: number;
  cost: number;
  netBenefit: number;
  scenario: string;
}

export default function HedgingSimulator() {
  const [portfolioValue, setPortfolioValue] = useState("100000");
  const [hedgePercentage, setHedgePercentage] = useState("50");
  const [hedgeCost, setHedgeCost] = useState("5");
  const [marketDrop, setMarketDrop] = useState("-20");
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = () => {
    setIsSimulating(true);
    
    // Simulate calculation delay
    setTimeout(() => {
      const portfolio = parseFloat(portfolioValue) || 100000;
      const hedgePct = parseFloat(hedgePercentage) / 100 || 0.5;
      const cost = parseFloat(hedgeCost) / 100 || 0.05;
      const drop = parseFloat(marketDrop) / 100 || -0.2;

      // Calculate unhedged portfolio value after market drop
      const unhedgedValue = portfolio * (1 + drop);

      // Calculate hedged position value
      const hedgedAmount = portfolio * hedgePct;
      const unhedgedAmount = portfolio * (1 - hedgePct);
      
      // Hedge pays off proportionally to market drop (simplified put option)
      const hedgePayout = hedgedAmount * Math.abs(drop);
      const hedgeCostTotal = hedgedAmount * cost;
      
      // Total hedged portfolio value
      const hedgedValue = (unhedgedAmount * (1 + drop)) + hedgePayout - hedgeCostTotal;

      // Calculate protection and net benefit
      const protection = ((hedgedValue - unhedgedValue) / Math.abs(unhedgedValue - portfolio)) * 100;
      const netBenefit = hedgedValue - unhedgedValue;

      // Determine scenario
      let scenario = "Moderate Protection";
      if (protection > 80) scenario = "Excellent Protection";
      else if (protection > 60) scenario = "Good Protection";
      else if (protection > 40) scenario = "Moderate Protection";
      else if (protection > 20) scenario = "Minimal Protection";
      else scenario = "Ineffective Hedge";

      setSimulationResult({
        unhedgedValue,
        hedgedValue,
        protection,
        cost: hedgeCostTotal,
        netBenefit,
        scenario
      });
      
      setIsSimulating(false);
    }, 1500);
  };

  const resetSimulation = () => {
    setPortfolioValue("100000");
    setHedgePercentage("50");
    setHedgeCost("5");
    setMarketDrop("-20");
    setSimulationResult(null);
  };

  const getScenarioColor = (scenario: string) => {
    if (scenario.includes("Excellent")) return "bg-green-100 text-green-800";
    if (scenario.includes("Good")) return "bg-blue-100 text-blue-800";
    if (scenario.includes("Moderate")) return "bg-yellow-100 text-yellow-800";
    if (scenario.includes("Minimal")) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Hedging Simulator
          </CardTitle>
          <CardDescription>
            See how hedging can protect your portfolio from market downturns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="portfolio-value" className="text-sm font-medium">
                  Portfolio Value ($)
                </Label>
                <Input
                  id="portfolio-value"
                  type="number"
                  value={portfolioValue}
                  onChange={(e) => setPortfolioValue(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="hedge-percentage" className="text-sm font-medium">
                  Hedge Percentage (%)
                </Label>
                <Input
                  id="hedge-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={hedgePercentage}
                  onChange={(e) => setHedgePercentage(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentage of portfolio to hedge
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="hedge-cost" className="text-sm font-medium">
                  Hedge Cost (%)
                </Label>
                <Input
                  id="hedge-cost"
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={hedgeCost}
                  onChange={(e) => setHedgeCost(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Annual cost of hedge (e.g., put options premium)
                </p>
              </div>
              
              <div>
                <Label htmlFor="market-drop" className="text-sm font-medium">
                  Market Drop (%)
                </Label>
                <Input
                  id="market-drop"
                  type="number"
                  min="-50"
                  max="0"
                  value={marketDrop}
                  onChange={(e) => setMarketDrop(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Simulated market decline (negative value)
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={runSimulation} 
              disabled={isSimulating}
              className="flex-1"
            >
              {isSimulating ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                  Simulating...
                </div>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Simulation
                </>
              )}
            </Button>
            <Button variant="outline" onClick={resetSimulation}>
              <RotateCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Simulation Results */}
      {simulationResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portfolio Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Unhedged Value</Label>
                  <div className="text-2xl font-bold text-red-600">
                    ${simulationResult.unhedgedValue.toLocaleString()}
                  </div>
                  <div className="text-xs text-red-600">
                    {((simulationResult.unhedgedValue - parseFloat(portfolioValue)) / parseFloat(portfolioValue) * 100).toFixed(1)}% change
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Hedged Value</Label>
                  <div className="text-2xl font-bold text-green-600">
                    ${simulationResult.hedgedValue.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600">
                    {((simulationResult.hedgedValue - parseFloat(portfolioValue)) / parseFloat(portfolioValue) * 100).toFixed(1)}% change
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Net Protection</span>
                  <span className="text-lg font-bold text-blue-600">
                    ${simulationResult.netBenefit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">Hedge Cost</span>
                  <span className="text-sm font-medium">
                    ${simulationResult.cost.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Protection Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Label className="text-sm text-gray-500">Protection Level</Label>
                <div className="text-3xl font-bold text-blue-600 mt-1">
                  {simulationResult.protection.toFixed(1)}%
                </div>
                <Badge className={getScenarioColor(simulationResult.scenario)}>
                  {simulationResult.scenario}
                </Badge>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>Analysis:</strong> Your hedge protected {simulationResult.protection.toFixed(1)}% 
                    of potential losses. The cost of protection was ${simulationResult.cost.toLocaleString()}, 
                    resulting in a net benefit of ${simulationResult.netBenefit.toLocaleString()}.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Educational Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Understanding Hedging Strategies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Partial Hedging (25-50%)
              </h4>
              <p className="text-sm text-green-800">
                Balance between protection and cost. Good for moderate risk tolerance.
                Maintains some upside potential while limiting downside.
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Full Hedging (75-100%)
              </h4>
              <p className="text-sm text-blue-800">
                Maximum protection against losses. Higher cost but preserves capital.
                Suitable for conservative portfolios or near-term goals.
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Dynamic Hedging
              </h4>
              <p className="text-sm text-yellow-800">
                Adjust hedge percentage based on market conditions. 
                More sophisticated but potentially more cost-effective.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Key Considerations</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Cost vs Protection:</strong> Higher hedge percentages provide more protection but cost more</li>
              <li>• <strong>Market Timing:</strong> Hedging is most valuable before expected volatility</li>
              <li>• <strong>Opportunity Cost:</strong> Money spent on hedges can't be used for other investments</li>
              <li>• <strong>Tax Implications:</strong> Hedge costs may be tax-deductible (consult advisor)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
