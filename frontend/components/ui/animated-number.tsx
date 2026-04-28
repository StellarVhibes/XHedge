"use client";

import { useAnimatedNumber } from "@/hooks/use-animated-number";

interface AnimatedNumberProps {
  /** The target numeric value to display. */
  value: number;
  /**
   * Pure function that converts the interpolated number to a display string.
   * Called on every animation frame — keep it allocation-free for best performance.
   */
  format: (n: number) => string;
  /** Animation duration in milliseconds. Defaults to 600. */
  duration?: number;
  className?: string;
}

/**
 * Renders a number that animates smoothly when `value` changes.
 *
 * - Easing: ease-out cubic over `duration` ms
 * - Respects `prefers-reduced-motion` (instant jump when set)
 * - Pauses when the tab is hidden; resumes seamlessly on return
 * - No animation when the new value equals the current value
 */
export function AnimatedNumber({
  value,
  format,
  duration,
  className,
}: AnimatedNumberProps) {
  const animated = useAnimatedNumber(value, duration);
  return <span className={className}>{format(animated)}</span>;
}
