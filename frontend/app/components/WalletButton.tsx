"use client";

import { useFreighter } from "../context/FreighterContext";

/**
 * Truncates a Stellar public key for display.
 * e.g. GABCD...WXYZ
 */
function truncateKey(key: string, prefixLen = 4, suffixLen = 4): string {
  if (key.length <= prefixLen + suffixLen) return key;
  return `${key.slice(0, prefixLen)}...${key.slice(-suffixLen)}`;
}

export function WalletButton() {
  const { isConnected, isLoading, publicKey, error, connect, disconnect } =
    useFreighter();

  if (isLoading) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/60 
                   px-4 py-2 text-sm text-gray-400 backdrop-blur-sm"
      >
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
        Connecting…
      </button>
    );
  }

  if (isConnected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-3 py-2 
                     text-sm font-mono text-indigo-300"
          title={publicKey}
        >
          {truncateKey(publicKey, 4, 4)}
        </span>
        <button
          onClick={disconnect}
          className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm 
                     text-red-400 transition-colors hover:bg-red-900/40"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white 
                   transition-colors hover:bg-indigo-500 active:bg-indigo-700"
      >
        Connect Wallet
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
