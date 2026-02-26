"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  ComposedChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Zap,
  Shield,
  Activity,
  Calendar,
  Download
} from "lucide-react";
import { PermissionGate } from "@/components/PartnerGuard";

const generatePerformanceMetrics = () => [
  { 
    date: "Week 1", 
    returns: 2.4, 
    volatility: 8.2, 
    sharpe: 1.8, 
    maxDrawdown: -2.1,
    winRate: 68,
    volume: 1250000
  },
  { 
    date: "Week 2", 
    returns: 3.1, 
    volatility: 7.8, 
    sharpe: 2.1, 
    maxDrawdown: -1.8,
    winRate: 72,
    volume: 1480000
  },
  { 
    date: "Week 3", 
    returns: 1.8, 
    volatility: 9.1, 
    sharpe: 1.5, 
    maxDrawdown: -3.2,
    winRate: 64,
    volume: 980000
  },
  { 
    date: "Week 4", 
    returns: 4.2, 
    volatility: 6.5, 
    sharpe: 2.8, 
    maxDrawdown: -1.2,
    winRate: 78,
    volume: 1820000
  },
  { 
    date: "Week 5", 
    returns: 2.9, 
    volatility: 7.2, 
    sharpe: 2.3, 
    maxDrawdown: -2.4,
    winRate: 70,
    volume: 1560000
  },
  { 
    date: "Week 6", 
    returns: 3.6, 
    volatility: 6.8, 
    sharpe: 2.6, 
    maxDrawdown: -1.6,
    winRate: 74,
    volume: 1710000
  },
];

const generateRiskMetrics = () => [
  { metric: "Value at Risk (95%)", current: 4.2, benchmark: 5.8, status: "good" },
  { metric: "Expected Shortfall", current: 6.1, benchmark: 7.2, status: "good" },
  { metric: "Beta Coefficient", current: 0.82, benchmark: 1.0, status: "good" },
  { metric: "Correlation to Market", current: 0.34, benchmark: 0.5, status: "good" },
  { metric: "Maximum Drawdown", current: -3.2, benchmark: -8.5, status: "excellent" },
  { metric: "Volatility (Annual)", current: 18.4, benchmark: 22.0, status: "good" },
];

const generateStrategyPerformance = () => [
  { 
    strategy: "Conservative", 
    returns: 8.2, 
    risk: 4.1, 
    sharpe: 2.0,
    allocation: 35,
    status: "active"
  },
  { 
    strategy: "Balanced", 
    returns: 12.4, 
    risk: 7.8, 
    sharpe: 1.6,
    allocation: 40,
    status: "active"
  },
  { 
    strategy: "Aggressive", 
    returns: 18.6, 
    risk: 12.3, 
    sharpe: 1.5,
    allocation: 25,
    status: "active"
  },
];

export default function PartnerPerformance() {
  const [timeRange, setTimeRange] = useState("6w");
  const [isLoading, setIsLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<any[]>([]);
  const [strategyPerformance, setStrategyPerformance] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      setPerformanceData(generatePerformanceMetrics());
      setRiskMetrics(generateRiskMetrics());
      setStrategyPerformance(generateStrategyPerformance());
      setIsLoading(false);
    };

    loadData();
  }, [timeRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading performance analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Analytics</h1>
          <p className="text-muted-foreground">
            Detailed performance metrics and risk analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="1w">1 Week</option>
            <option value="2w">2 Weeks</option>
            <option value="6w">6 Weeks</option>
            <option value="3m">3 Months</option>
          </select>
          <PermissionGate permission="export_data">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Return</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18.4%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3</div>
            <p className="text-xs text-muted-foreground">
              Risk-adjusted returns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">71%</div>
            <p className="text-xs text-muted-foreground">
              Successful trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-3.2%</div>
            <p className="text-xs text-muted-foreground">
              Maximum loss period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Returns vs Volatility */}
        <Card>
          <CardHeader>
            <CardTitle>Returns vs Volatility</CardTitle>
            <CardDescription>Weekly performance and risk metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="returns" fill="#00D5FF" name="Returns %" />
                <Line yAxisId="right" type="monotone" dataKey="volatility" stroke="#EF4444" name="Volatility %" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sharpe Ratio Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Sharpe Ratio Trend</CardTitle>
            <CardDescription>Risk-adjusted performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorSharpe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <ReferenceLine y={2} stroke="#EF4444" strokeDasharray="5 5" />
                <Area 
                  type="monotone" 
                  dataKey="sharpe" 
                  stroke="#10B981" 
                  fillOpacity={1} 
                  fill="url(#colorSharpe)" 
                  name="Sharpe Ratio"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Metrics</CardTitle>
          <CardDescription>Current risk assessment vs benchmarks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                <div className="flex-1">
                  <div className="font-medium">{metric.metric}</div>
                  <div className="text-sm text-muted-foreground">
                    Current: {metric.current}% | Benchmark: {metric.benchmark}%
                  </div>
                </div>
                <Badge className={getStatusColor(metric.status)}>
                  {metric.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strategy Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Performance</CardTitle>
          <CardDescription>Performance by investment strategy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {strategyPerformance.map((strategy, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{strategy.strategy}</h4>
                    <Badge variant={strategy.status === 'active' ? 'default' : 'secondary'}>
                      {strategy.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Allocation: {strategy.allocation}%
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Returns</div>
                    <div className="font-medium text-green-600">+{strategy.returns}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Risk</div>
                    <div className="font-medium">{strategy.risk}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Sharpe</div>
                    <div className="font-medium">{strategy.sharpe}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
