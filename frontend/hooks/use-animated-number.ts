"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/** Ease-out cubic: fast start, decelerates to rest. O(1) — pure arithmetic. */
const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

interface AnimState {
  from: number;
  to: number;
  rafId: number;
  /** Timestamp (ms) when the current run started. -1 = not yet started. */
  startTime: number;
  /** Milliseconds already animated before the last pause. */
  elapsed: number;
}

/**
 * Smoothly interpolates a numeric value using ease-out cubic easing.
 *
 * Complexity
 *   - Space  O(1): all mutable state lives in a single ref; zero per-frame allocations.
 *   - Time   O(1) per frame: one arithmetic expression per requestAnimationFrame tick.
 *
 * Features
 *   - Pauses automatically when the tab is hidden (Page Visibility API).
 *   - Respects `prefers-reduced-motion`: skips to the target value immediately.
 *   - No animation when the new value equals the current value.
 *   - Interruption-safe: a new target cancels and restarts from the current position.
 */
export function useAnimatedNumber(target: number, duration = 600): number {
  const [displayed, setDisplayed] = useState(target);

  /**
   * Tracks the most recently displayed value via ref so the target-change
   * effect always reads the latest number without a stale closure.
   */
  const currentRef = useRef(target);

  /** All animation state in one ref — avoids per-frame object allocation. */
  const anim = useRef<AnimState>({
    from: target,
    to: target,
    rafId: 0,
    startTime: -1,
    elapsed: 0,
  });

  /**
   * Keep duration in a ref so `runAnimation` can have an empty dependency
   * array (stable reference) while still reading the latest duration value.
   */
  const durationRef = useRef(duration);
  durationRef.current = duration;

  /**
   * Starts (or resumes) the rAF loop.
   * Intentionally stable: reads all mutable values through refs.
   */
  const runAnimation = useCallback((): void => {
    const a = anim.current;

    const tick = (timestamp: number): void => {
      if (a.startTime < 0) a.startTime = timestamp;

      const t = Math.min(
        (timestamp - a.startTime + a.elapsed) / durationRef.current,
        1,
      );

      const next = a.from + (a.to - a.from) * easeOutCubic(t);
      currentRef.current = next;
      setDisplayed(next);

      if (t < 1) {
        a.rafId = requestAnimationFrame(tick);
      } else {
        // Mark complete so the visibility-change handler does not re-trigger.
        a.from = a.to;
        a.rafId = 0;
      }
    };

    a.startTime = -1;
    a.rafId = requestAnimationFrame(tick);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** React to target changes. */
  useEffect(() => {
    const a = anim.current;
    if (target === a.to) return;

    // Honour the user's motion preference — instant jump, no rAF.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cancelAnimationFrame(a.rafId);
      a.from = a.to = target;
      a.elapsed = 0;
      a.rafId = 0;
      currentRef.current = target;
      setDisplayed(target);
      return;
    }

    // Cancel any in-progress frame; animate from the current display value.
    cancelAnimationFrame(a.rafId);
    a.from = currentRef.current;
    a.to = target;
    a.elapsed = 0;
    runAnimation();

    return (): void => {
      cancelAnimationFrame(a.rafId);
    };
  }, [target, runAnimation]);

  /** Pause when the tab is hidden; resume when it becomes visible again. */
  useEffect(() => {
    const a = anim.current;
    let hiddenAt = -1;

    const onVisibilityChange = (): void => {
      if (document.hidden) {
        if (a.rafId) {
          cancelAnimationFrame(a.rafId);
          a.rafId = 0;
          // Accumulate elapsed time so the resume starts where we left off.
          if (a.startTime >= 0) {
            a.elapsed += performance.now() - a.startTime;
            a.startTime = -1;
          }
          hiddenAt = performance.now();
        }
      } else if (hiddenAt >= 0 && a.rafId === 0 && a.to !== a.from) {
        hiddenAt = -1;
        runAnimation();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return (): void => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cancelAnimationFrame(a.rafId);
    };
  }, [runAnimation]);

  return displayed;
}
