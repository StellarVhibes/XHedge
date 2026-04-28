"use client";

import { useState } from "react";
import { CopyCheck } from "lucide-react";

interface AddressCopyProps {
  address: string;
  truncatedLength?: number;
  className?: string;
  onCopy?: (address: string) => void;
}

export function AddressCopy({
  address,
  truncatedLength = 10,
  className = "",
  onCopy,
}: AddressCopyProps) {
  const [copied, setCopied] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      if (onCopy) onCopy(address);

      // Clear existing timeout if any
      if (timeoutId) clearTimeout(timeoutId);

      // Set new timeout to reset copied state after 2 seconds
      const id = setTimeout(() => {
        setCopied(false);
      }, 2000);
      setTimeoutId(id);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  const truncatedAddress =
    !address || address.length <= truncatedLength
      ? address
      : `${address.slice(0, truncatedLength / 2)}...${address.slice(
          -truncatedLength / 2
        )}`;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent transition-colors ${className}`}
      aria-label={copied ? "Address copied" : "Copy address"}
      aria-live="polite"
      data-testid="address-copy-button"
    >
      {copied ? (
        <CopyCheck className="h-3 w-3" aria-hidden="true" />
      ) : (
        <>
          <span className="font-mono">{truncatedAddress}</span>
          <CopyCheck className="h-3 w-3 opacity-0" aria-hidden="true" />
        </>
      )}
    </button>
  );
}