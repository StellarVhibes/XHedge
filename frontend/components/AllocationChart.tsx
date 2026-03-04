"use client";
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';

export type Slice = {
  name: string;
  value: number;
  color?: string;
  riskScore?: number; // 0–100
};

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  slice: Slice | null;
  pct: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * (Math.PI / 180.0);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

function getRiskLabel(score: number): { label: string; color: string } {
  if (score <= 30) return { label: 'Low', color: 'hsl(142.1 76.2% 36.3%)' };
  if (score <= 60) return { label: 'Medium', color: 'hsl(38 92% 50%)' };
  return { label: 'High', color: 'hsl(0 72% 51%)' };
}

const TOOLTIP_WIDTH = 180;
const TOOLTIP_OFFSET = 12;

const AllocationChart = memo(function AllocationChart({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((s, c) => s + c.value, 0) || 1;
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, slice: null, pct: 0 });
  const [hovered, setHovered] = useState<number | null>(null);

  const showTooltip = useCallback((e: React.MouseEvent, slice: Slice, pct: number) => {
    const container = containerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    let x = e.clientX - bounds.left + TOOLTIP_OFFSET;
    let y = e.clientY - bounds.top + TOOLTIP_OFFSET;
    // Prevent tooltip from overflowing right edge
    if (x + TOOLTIP_WIDTH > bounds.width) {
      x = e.clientX - bounds.left - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
    }
    setTooltip({ visible: true, x, y, slice, pct });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }));
    setHovered(null);
  }, []);

  let angle = 0;

  return (
    <div ref={containerRef} className="flex flex-col items-center relative" style={{ userSelect: 'none' }}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        {slices.map((slice, i) => {
          const from = angle;
          const sliceAngle = (slice.value / total) * 360;
          angle += sliceAngle;
          const to = angle;
          const path = describeArc(cx, cy, r, from, to);
          const color = slice.color ?? `hsl(${(i * 80) % 360} 70% 50%)`;
          const isHovered = hovered === i;
          const pct = Math.round((slice.value / total) * 100);

          return (
            <path
              key={i}
              d={path}
              fill={color}
              stroke="#ffffff"
              strokeWidth={isHovered ? 2 : 1}
              style={{
                transform: isHovered ? `scale(1.04)` : 'scale(1)',
                transformOrigin: `${cx}px ${cy}px`,
                transition: 'transform 0.15s ease, filter 0.15s ease',
                filter: isHovered ? 'brightness(1.15) drop-shadow(0 2px 6px rgba(0,0,0,0.18))' : 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { setHovered(i); showTooltip(e, slice, pct); }}
              onMouseMove={(e) => showTooltip(e, slice, pct)}
              onMouseLeave={hideTooltip}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={r / 2} fill="#ffffff" style={{ pointerEvents: 'none' }} />
      </svg>

      {/* Tooltip */}
      {tooltip.visible && tooltip.slice && (
        <div
          className="pointer-events-none absolute z-50 rounded-lg shadow-lg border text-sm"
          style={{
            top: tooltip.y,
            left: tooltip.x,
            width: TOOLTIP_WIDTH,
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--card-foreground))',
            padding: '10px 12px',
          }}
        >
          <div className="font-semibold mb-1 truncate" style={{ color: 'hsl(var(--foreground))' }}>
            {tooltip.slice.name}
          </div>
          <div className="flex justify-between text-xs mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <span>Allocation</span>
            <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>
              {tooltip.pct}%
            </span>
          </div>
          {tooltip.slice.riskScore !== undefined && (() => {
            const { label, color } = getRiskLabel(tooltip.slice.riskScore!);
            return (
              <div className="flex justify-between text-xs">
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>Risk Score</span>
                <span className="font-medium flex items-center gap-1">
                  <span style={{ color }}>{tooltip.slice.riskScore}</span>
                  <span
                    className="rounded px-1 py-0.5 text-white text-[10px] leading-none"
                    style={{ backgroundColor: color }}
                  >
                    {label}
                  </span>
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 w-56">
        {slices.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-sm py-0.5 rounded cursor-default transition-colors"
            style={{
              backgroundColor: hovered === i ? 'hsl(var(--muted) / 0.5)' : 'transparent',
              padding: '2px 4px',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                style={{
                  width: 12,
                  height: 12,
                  display: 'inline-block',
                  background: s.color ?? `hsl(${(i * 80) % 360} 70% 50%)`,
                  borderRadius: 3,
                  flexShrink: 0,
                }}
              />
              <span className="truncate">{s.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>{s.value}</span>
              {s.riskScore !== undefined && (
                <span
                  className="text-[10px] font-medium px-1 py-0.5 rounded"
                  style={{
                    backgroundColor: getRiskLabel(s.riskScore).color + '22',
                    color: getRiskLabel(s.riskScore).color,
                  }}
                >
                  R{s.riskScore}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default AllocationChart;