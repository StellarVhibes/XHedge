"use client";

import { useState, useEffect, useCallback } from "react";
import { InsightEntry } from "@/app/components/AiInsightStream";

export function useAiInsights() {
  const [entries, setEntries] = useState<InsightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      const response = await fetch("/api/ai/insights");
      if (!response.ok) {
        throw new Error("Failed to fetch AI insights");
      }
      const data = await response.json();
      
      // Convert ISO strings back to Date objects
      const parsedData = data.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
      
      setEntries(parsedData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchInsights, 30000);
    return () => clearInterval(interval);
  }, [fetchInsights]);

  return { entries, isLoading, error, refresh: fetchInsights };
}
