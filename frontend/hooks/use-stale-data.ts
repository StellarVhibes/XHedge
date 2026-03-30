"use client";

import { useState, useCallback, useRef } from "react";

export interface StaleDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: Date | null;
  isStale: boolean;
}

/**
 * Hook to track data staleness.
 * @param staleThresholdMs - Time in ms after which data is considered stale (default: 5 minutes)
 */
export function useStaleData<T>(staleThresholdMs = 5 * 60 * 1000) {
  const [state, setState] = useState<StaleDataState<T>>({
    data: null,
    loading: false,
    error: null,
    lastFetchedAt: null,
    isStale: false,
  });

  const staleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setData = useCallback(
    (data: T) => {
      const now = new Date();

      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);

      setState({
        data,
        loading: false,
        error: null,
        lastFetchedAt: now,
        isStale: false,
      });

      // Mark as stale after threshold
      staleTimerRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, isStale: true }));
      }, staleThresholdMs);
    },
    [staleThresholdMs]
  );

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, loading: false, error }));
  }, []);

  return { state, setData, setLoading, setError };
}

/**
 * Returns a human-readable "time ago" string from a Date.
 */
export function getTimeAgo(date: Date | null): string {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
