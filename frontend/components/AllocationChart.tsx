"use client";
import React from 'react';

type Slice = { name: string; value: number; color?: string };

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * (Math.PI / 180.0);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

export default function AllocationChart({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((s, c) => s + c.value, 0) || 1;
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  let angle = 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((slice, i) => {
          const from = angle;
          const sliceAngle = (slice.value / total) * 360;
          angle += sliceAngle;
          const to = angle;
          const path = describeArc(cx, cy, r, from, to);
          return (
            <path key={i} d={path} fill={slice.color ?? (`hsl(${(i * 80) % 360} 70% 50%)`)} stroke="#ffffff" />
          );
        })}
        <circle cx={cx} cy={cy} r={r / 2} fill="#ffffff" />
      </svg>
      <div className="mt-3 w-56">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span style={{ width: 12, height: 12, display: 'inline-block', background: s.color ?? (`hsl(${(i * 80) % 360} 70% 50%)`) }} />
              <span className="truncate">{s.name}</span>
            </div>
            <div className="text-muted-foreground">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
