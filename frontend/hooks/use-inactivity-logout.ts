"use client";

import { useEffect, useRef, useCallback } from "react";

const DEFAULT_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_THRESHOLD = 60 * 1000; // 60 seconds before logout

interface InactivityOptions {
  timeout?: number;
  onLogout: () => void;
  onWarning?: () => void;
}

export function useInactivityLogout({
  timeout = DEFAULT_TIMEOUT,
  onLogout,
  onWarning,
}: InactivityOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    warningTimerRef.current = setTimeout(() => {
      onWarning?.();
    }, timeout - WARNING_THRESHOLD);

    timerRef.current = setTimeout(() => {
      onLogout();
    }, timeout);
  }, [timeout, onLogout, onWarning]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

    const handleActivity = () => {
      resetTimers();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    resetTimers();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [resetTimers]);
}
