"use client";

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

type DataPoint = {
    date: string;
    apy: number;
};

interface VaultAPYChartProps {
    data: DataPoint[];
    loading?: boolean;
}

export default function VaultAPYChart({ data, loading = false }: VaultAPYChartProps) {
    if (loading) {
        return (
            <div className="w-full h-72 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Loading chart data...</p>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-card/50 text-muted-foreground">
                No APY data available
            </div>
        );
    }

    return (
        <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorApy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--card-foreground))'
                        }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'APY']}
                    />
                    <Area
                        type="monotone"
                        dataKey="apy"
                        stroke="hsl(142.1 76.2% 36.3%)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorApy)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
