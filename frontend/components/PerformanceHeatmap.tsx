"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/lib/i18n-context';

interface HeatmapData {
  date: string;
  return: number;
}

interface PerformanceHeatmapProps {
  data: HeatmapData[];
  loading?: boolean;
  error?: string | null;
}

// Helper function to get calendar days for a given year
const getCalendarDays = (year: number) => {
  const days = [];
  const firstDay = new Date(year, 0, 1);
  const lastDay = new Date(year, 11, 31);
  
  // Pad to start on Sunday
  const startPadding = firstDay.getDay();
  for (let i = 0; i < startPadding; i++) {
    days.push(null);
  }
  
  // Add all days of the year
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  
  return days;
};

// Helper function to format date as YYYY-MM-DD
const formatDateKey = (date: Date) => {
  return date.toISOString().split('T')[0];
};

// Helper function to get color based on return value
const getHeatmapColor = (returnValue: number, minReturn: number, maxReturn: number) => {
  if (returnValue === 0) return 'bg-gray-200';
  
  const range = maxReturn - minReturn;
  if (range === 0) return returnValue > 0 ? 'bg-green-400' : 'bg-red-400';
  
  const normalized = (returnValue - minReturn) / range;
  
  if (returnValue > 0) {
    // Green scale for positive returns
    const intensity = Math.min(normalized * 2, 1);
    if (intensity > 0.8) return 'bg-green-600';
    if (intensity > 0.6) return 'bg-green-500';
    if (intensity > 0.4) return 'bg-green-400';
    if (intensity > 0.2) return 'bg-green-300';
    return 'bg-green-200';
  } else {
    // Red scale for negative returns
    const intensity = Math.min((1 - normalized) * 2, 1);
    if (intensity > 0.8) return 'bg-red-600';
    if (intensity > 0.6) return 'bg-red-500';
    if (intensity > 0.4) return 'bg-red-400';
    if (intensity > 0.2) return 'bg-red-300';
    return 'bg-red-200';
  }
};

export default function PerformanceHeatmap({ data, loading = false, error = null }: PerformanceHeatmapProps) {
  const t = useTranslations("Analytics");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Process data into a map for quick lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(item => {
      map.set(item.date, item.return);
    });
    return map;
  }, [data]);
  
  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.forEach(item => {
      const year = item.date.split('-')[0];
      years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [data]);
  
  // Get min and max returns for color scaling
  const { minReturn, maxReturn } = useMemo(() => {
    const returns = data.map(item => item.return);
    return {
      minReturn: Math.min(...returns),
      maxReturn: Math.max(...returns)
    };
  }, [data]);
  
  // Get calendar days for selected year
  const calendarDays = useMemo(() => {
    return getCalendarDays(parseInt(selectedYear));
  }, [selectedYear]);
  
  // Group days into weeks
  const weeks = useMemo(() => {
    const weekArray = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weekArray.push(calendarDays.slice(i, i + 7));
    }
    return weekArray;
  }, [calendarDays]);
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("performanceHeatmap")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-32" />
            <div className="grid grid-cols-53 gap-1">
              {Array.from({ length: 53 * 7 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-3 rounded-sm" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("performanceHeatmap")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-card/50 text-muted-foreground">
            <p className="text-sm text-destructive" aria-live="assertive" role="alert">
              {t("failedToLoadData")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("performanceHeatmap")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-card/50 text-muted-foreground">
            <p className="text-sm text-muted-foreground">
              {t("noDataAvailable")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("performanceHeatmap")}</CardTitle>
            {availableYears.length > 1 && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Month labels */}
            <div className="grid grid-cols-53 gap-1 text-xs text-muted-foreground">
              {Array.from({ length: 53 }).map((_, weekIndex) => {
                const dayIndex = weekIndex * 7;
                const day = calendarDays[dayIndex];
                if (!day) return <div key={weekIndex} />;
                
                const month = day.getMonth();
                const isFirstWeekOfMonth = day.getDate() <= 7;
                
                if (isFirstWeekOfMonth) {
                  return (
                    <div key={weekIndex} className="col-span-4">
                      {monthNames[month]}
                    </div>
                  );
                }
                
                return <div key={weekIndex} />;
              })}
            </div>
            
            {/* Week day labels */}
            <div className="grid grid-cols-53 gap-1">
              {weekDays.map((day, index) => (
                <div key={index} className="text-xs text-muted-foreground w-3 text-center">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Heatmap grid */}
            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-53 gap-1">
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      return <div key={`${weekIndex}-${dayIndex}`} className="w-3 h-3" />;
                    }
                    
                    const dateKey = formatDateKey(day);
                    const returnValue = dataMap.get(dateKey) || 0;
                    const colorClass = getHeatmapColor(returnValue, minReturn, maxReturn);
                    const formattedReturn = `${returnValue > 0 ? '+' : ''}${returnValue.toFixed(2)}%`;
                    
                    return (
                      <Tooltip key={`${weekIndex}-${dayIndex}`}>
                        <TooltipTrigger>
                          <div
                            className={`w-3 h-3 rounded-sm cursor-pointer border border-border/50 ${colorClass} hover:ring-2 hover:ring-primary/50 transition-all`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <div className="font-medium">{day.toLocaleDateString()}</div>
                            <div className={`font-mono ${returnValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formattedReturn}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span>{t("less")}</span>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-sm bg-red-600" />
                  <div className="w-3 h-3 rounded-sm bg-red-500" />
                  <div className="w-3 h-3 rounded-sm bg-red-400" />
                  <div className="w-3 h-3 rounded-sm bg-red-300" />
                  <div className="w-3 h-3 rounded-sm bg-gray-200" />
                  <div className="w-3 h-3 rounded-sm bg-green-300" />
                  <div className="w-3 h-3 rounded-sm bg-green-400" />
                  <div className="w-3 h-3 rounded-sm bg-green-500" />
                  <div className="w-3 h-3 rounded-sm bg-green-600" />
                </div>
                <span>{t("more")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-sm bg-gray-200" />
                <span>{t("noData")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
