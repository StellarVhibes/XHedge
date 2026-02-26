"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Eye,
  Calendar
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { usePartnerAuth } from "@/app/context/PartnerAuthContext";
import { PermissionGate } from "@/components/PartnerGuard";

// Mock data generators
const generatePerformanceData = () => [
  { date: "Jan", tvl: 4500000, users: 1200, volume: 2800000, apy: 5.2 },
  { date: "Feb", tvl: 5200000, users: 1450, volume: 3200000, apy: 5.8 },
  { date: "Mar", tvl: 6100000, users: 1680, volume: 4100000, apy: 6.1 },
  { date: "Apr", tvl: 7300000, users: 1920, volume: 5300000, apy: 6.4 },
  { date: "May", tvl: 8900000, users: 2300, volume: 6800000, apy: 6.8 },
  { date: "Jun", tvl: 10500000, users: 2750, volume: 8200000, apy: 7.2 },
];

const generateAssetAllocation = () => [
  { name: "Stellar Lumens", value: 35, color: "#00D5FF" },
  { name: "USDC", value: 28, color: "#2775CA" },
  { name: "EURC", value: 18, color: "#2E5266" },
  { name: "BTC", value: 12, color: "#F7931A" },
  { name: "Others", value: 7, color: "#6B7280" },
];

const generateUserGrowth = () => [
  { month: "Jan", new: 120, active: 890, churn: 15 },
  { month: "Feb", new: 145, active: 1020, churn: 18 },
  { month: "Mar", new: 168, active: 1170, churn: 22 },
  { month: "Apr", new: 192, active: 1340, churn: 25 },
  { month: "May", new: 230, active: 1545, churn: 28 },
  { month: "Jun", new: 275, active: 1792, churn: 32 },
];

const generateRecentActivity = () => [
  { id: 1, type: "deposit", user: "0x1234...5678", amount: 50000, timestamp: "2 mins ago", status: "completed" },
  { id: 2, type: "withdraw", user: "0xabcd...ef12", amount: 25000, timestamp: "5 mins ago", status: "completed" },
  { id: 3, type: "deposit", user: "0x5678...9abc", amount: 100000, timestamp: "12 mins ago", status: "completed" },
  { id: 4, type: "deposit", user: "0xdef0...1234", amount: 75000, timestamp: "18 mins ago", status: "pending" },
  { id: 5, type: "withdraw", user: "0x3456...7890", amount: 30000, timestamp: "25 mins ago", status: "completed" },
];

export default function PartnerDashboard() {
  const { partner } = usePartnerAuth();
  const [timeRange, setTimeRange] = useState("6m");
  const [isLoading, setIsLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [assetAllocation, setAssetAllocation] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    // Simulate data loading
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setPerformanceData(generatePerformanceData());
      setAssetAllocation(generateAssetAllocation());
      setUserGrowth(generateUserGrowth());
      setRecentActivity(generateRecentActivity());
      setIsLoading(false);
    };

    loadData();
  }, [timeRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const metrics = [
    {
      title: "Total Value Locked",
      value: formatCurrency(10500000),
      change: "+18.2%",
      trend: "up",
      icon: DollarSign,
      description: "vs last month",
    },
    {
      title: "Active Users",
      value: formatNumber(2750),
      change: "+15.8%",
      trend: "up", 
      icon: Users,
      description: "vs last month",
    },
    {
      title: "Monthly Volume",
      value: formatCurrency(8200000),
      change: "+22.4%",
      trend: "up",
      icon: Activity,
      description: "vs last month",
    },
    {
      title: "Average APY",
      value: "7.2%",
      change: "+0.4%",
      trend: "up",
      icon: TrendingUp,
      description: "vs last month",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading partner metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partner Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor ecosystem performance and metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="1m">1 Month</option>
            <option value="3m">3 Months</option>
            <option value="6m">6 Months</option>
            <option value="1y">1 Year</option>
          </select>
          <PermissionGate permission="export_data">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                {metric.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span className={metric.trend === "up" ? "text-green-500" : "text-red-500"}>
                  {metric.change}
                </span>
                <span>{metric.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TVL Growth */}
        <Card>
          <CardHeader>
            <CardTitle>TVL Growth</CardTitle>
            <CardDescription>Total Value Locked over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D5FF" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00D5FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), "TVL"]}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="tvl" 
                  stroke="#00D5FF" 
                  fillOpacity={1} 
                  fill="url(#colorTvl)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Asset Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Distribution of assets in vault</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={assetAllocation}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {assetAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value}%`, "Allocation"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>New and active users over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="new" stroke="#00D5FF" name="New Users" />
                <Line type="monotone" dataKey="active" stroke="#10B981" name="Active Users" />
                <Line type="monotone" dataKey="churn" stroke="#EF4444" name="Churn" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Volume & APY */}
        <Card>
          <CardHeader>
            <CardTitle>Volume & APY Trends</CardTitle>
            <CardDescription>Monthly volume and average APY</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="volume" fill="#00D5FF" name="Volume" />
                <Line yAxisId="right" type="monotone" dataKey="apy" stroke="#10B981" name="APY %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest transactions and user activities</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'deposit' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <div className="font-medium">{activity.user}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {activity.type} • {activity.timestamp}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {activity.type === 'deposit' ? '+' : '-'}{formatCurrency(activity.amount)}
                  </div>
                  <Badge 
                    variant={activity.status === 'completed' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {activity.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
