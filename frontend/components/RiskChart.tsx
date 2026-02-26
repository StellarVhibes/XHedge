"use client";

import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface RiskChartProps {
    score: number; // 0 to 100
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = (angle - 180) * (Math.PI / 180.0);
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
    };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, endAngle);
    return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
}

export function RiskChart({ score }: RiskChartProps) {
    const size = 220;
    const strokeWidth = 24;
    const cx = size / 2;
    const cy = size / 2 + 30; // Shift down for semi-circle
    const r = size / 2 - strokeWidth;

    const validScore = Math.max(0, Math.min(100, score));
    const activeAngle = (validScore / 100) * 180;

    let riskTier = {
        label: "Low",
        color: "hsl(var(--primary))",
        icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
        badgeClass: "bg-primary/20 text-primary border-primary/30"
    };

    if (validScore > 30 && validScore <= 70) {
        riskTier = {
            label: "Medium",
            color: "#eab308", // Yellow-500
            icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
            badgeClass: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
        };
    } else if (validScore > 70) {
        riskTier = {
            label: "High",
            color: "hsl(var(--destructive))",
            icon: <AlertCircle className="h-5 w-5 text-destructive" />,
            badgeClass: "bg-destructive/20 text-destructive border-destructive/30"
        };
    }

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-card border rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-4 w-full">
                <Activity className="h-6 w-6 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Volatility Dashboard</h2>
            </div>

            <div className="relative">
                <svg width={size} height={size / 2 + 40} viewBox={`0 0 ${size} ${size / 2 + 40}`}>
                    {/* Background Arc */}
                    <path
                        d={describeArc(cx, cy, r, 0, 180)}
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />
                    {/* Active Arc */}
                    <path
                        d={describeArc(cx, cy, r, 0, activeAngle)}
                        fill="none"
                        stroke={riskTier.color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                    />
                </svg>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="text-4xl font-bold tracking-tighter" style={{ color: riskTier.color }}>
                        {validScore}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                        Risk Score
                    </span>
                </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-2">
                <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 text-sm font-semibold ${riskTier.badgeClass}`}>
                    {riskTier.icon}
                    Current Risk Level: {riskTier.label}
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-[200px] mt-2">
                    Based on real-time market volatility indexing.
                </p>
            </div>
        </div>
    );
}
