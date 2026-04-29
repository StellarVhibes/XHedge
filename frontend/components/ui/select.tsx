"use client";

import React, { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
}

const SelectContext = createContext<SelectContextValue>({});

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div className="relative inline-block">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SelectValue() {
  const { value } = useContext(SelectContext);
  return <span>{value}</span>;
}

export function SelectContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "absolute right-0 z-50 mt-1 min-w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function SelectItem({ value, className, children, ...props }: SelectItemProps) {
  const { onValueChange } = useContext(SelectContext);

  return (
    <button
      type="button"
      className={cn("block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent", className)}
      onClick={() => onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  );
}
