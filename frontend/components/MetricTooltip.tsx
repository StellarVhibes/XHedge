"use client";

import { useState, useId, useRef, useCallback } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricTooltipProps {
  label: string;
  tip: string;
  className?: string;
}

/**
 * MetricTooltip
 *
 * Renders a metric label with an info icon. Hovering or focusing the icon
 * opens a tooltip. Pressing Escape closes it. Fully keyboard-accessible.
 */
export function MetricTooltip({ label, tip, className }: MetricTooltipProps) {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      btnRef.current?.blur();
    }
  }, []);

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span>{label}</span>
      <span className="relative inline-flex">
        <button
          ref={btnRef}
          type="button"
          aria-label={`More info about ${label}`}
          aria-describedby={open ? tipId : undefined}
          aria-expanded={open}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
          onKeyDown={handleKeyDown}
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 text-muted-foreground hover:text-foreground transition-colors"
          data-testid={`metric-tooltip-trigger-${label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        {open && (
          <span
            id={tipId}
            role="tooltip"
            data-testid={`metric-tooltip-content-${label.toLowerCase().replace(/\s+/g, "-")}`}
            className={cn(
              "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2",
              "w-56 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md",
              "pointer-events-none"
            )}
          >
            {tip}
            {/* Arrow */}
            <span
              aria-hidden="true"
              className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border"
            />
          </span>
        )}
      </span>
    </span>
  );
}
