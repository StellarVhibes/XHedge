"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <span className="group relative inline-flex">{children}</span>;
}

export function TooltipTrigger({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("inline-flex", className)} {...props}>
      {children}
    </span>
  );
}

export function TooltipContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md group-hover:block",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
