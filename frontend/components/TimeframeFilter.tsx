"use client";

import React from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export type Timeframe = '1D' | '1W' | '1M' | '1Y';

interface TimeframeFilterProps {
  selectedTimeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
  loading?: boolean;
}

const timeframes: { value: Timeframe; label: string }[] = [
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '1Y', label: '1Y' },
];

export default function TimeframeFilter({ 
  selectedTimeframe, 
  onTimeframeChange, 
  loading = false 
}: TimeframeFilterProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {timeframes.map((timeframe) => (
        <Button
          key={timeframe.value}
          variant={selectedTimeframe === timeframe.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onTimeframeChange(timeframe.value)}
          disabled={loading}
          className={cn(
            "h-7 px-3 text-xs font-medium transition-all",
            selectedTimeframe === timeframe.value 
              ? "bg-background shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {timeframe.label}
        </Button>
      ))}
    </div>
  );
}
