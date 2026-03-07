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
        <div className="flex flex-col items-center justify-center p-6 bg-card/50 backdrop-blur-sm border border-primary/10 rounded-2xl shadow-xl hover:shadow-primary/5 transition-all duration-300">
            <div className="flex items-center gap-2 mb-6 w-full">
                <div className="p-2 rounded-lg bg-primary/10">
                    <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-foreground tracking-tight">AI Risk Forecast</h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Predictive Engine v2.4</p>
                </div>
            </div>

            <div className="relative">
                <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
                    <defs>
                        <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="50%" stopColor="#eab308" />
                            <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                    </defs>
                    {/* Background Arc */}
                    <path
                        d={describeArc(cx, cy, r, 0, 180)}
                        fill="none"
                        stroke="hsl(var(--muted)/0.3)"
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
                        className="transition-all duration-1000 ease-in-out"
                        style={{ filter: `drop-shadow(0 0 8px ${riskTier.color}40)` }}
                    />
                </svg>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                            {validScore}
                        </span>
                        <span className="text-sm font-bold text-muted-foreground/50">%</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1 opacity-80">
                        Severity Index
                    </span>
                </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-4 w-full">
                <div className={`w-full py-2.5 rounded-xl border backdrop-blur-md flex items-center justify-center gap-2.5 text-sm font-bold transition-all duration-300 ${riskTier.badgeClass}`}>
                    {riskTier.icon}
                    <span>Current Risk Level: {riskTier.label}</span>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-white/5">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 animate-pulse" />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Our neural network is processing delta-neutral correlations.
                        Safe yield thresholds are maintained at <span className="text-foreground font-semibold">98.2%</span> efficiency.
                    </p>
                </div>
            </div>
        </div>
    );
}
