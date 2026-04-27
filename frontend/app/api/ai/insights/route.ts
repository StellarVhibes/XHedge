import { NextResponse } from "next/server";

export async function GET() {
  // In a real app, this might fetch from a database or a live stream
  // For this task, we'll return a set of insights with current timestamps
  const now = new Date();
  
  const insights = [
    {
      id: "insight-1",
      timestamp: new Date(now.getTime() - 1000 * 60 * 5).toISOString(), // 5 mins ago
      type: "info",
      message: "AI engine initialised. Monitoring FX feeds.",
    },
    {
      id: "insight-2",
      timestamp: new Date(now.getTime() - 1000 * 60 * 4).toISOString(), // 4 mins ago
      type: "info",
      message: `FX feed updated: XLM/USD ${(0.11 + Math.random() * 0.01).toFixed(4)}`,
    },
    {
      id: "insight-3",
      timestamp: new Date(now.getTime() - 1000 * 60 * 3).toISOString(), // 3 mins ago
      type: "rebalance",
      message: "Rebalance Triggered - USDC to XLM: 45% allocation threshold exceeded",
    },
    {
      id: "insight-4",
      timestamp: new Date(now.getTime() - 1000 * 60 * 2).toISOString(), // 2 mins ago
      type: "info",
      message: `Vault APY recalculated: ${(7 + Math.random() * 1).toFixed(2)}%`,
    },
    {
      id: "insight-5",
      timestamp: new Date(now.getTime() - 1000 * 60 * 1).toISOString(), // 1 min ago
      type: "warning",
      message: "Volatility spike detected - risk level elevated to HIGH",
    },
  ];

  return NextResponse.json(insights);
}
