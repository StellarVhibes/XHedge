"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUpFromLine, ArrowDownToLine, Clock, Hash, Download } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { Transaction, fetchTransactionHistory } from "@/lib/stellar";
import { formatNumber } from "@/lib/utils";
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { Button } from "@/components/ui/button";

/**
 * Builds a CSV string from a list of transactions, mirroring the UI table columns.
 *
 * @param transactions - The list of transactions to serialize.
 * @returns CSV content as a string.
 */
function buildTransactionCsv(transactions: Transaction[]): string {
  const headers = [
    "Type",
    "Amount",
    "Status",
    "Date",
    "Transaction Hash",
  ];

  const escapeValue = (value: string | number) => {
    const stringValue = String(value ?? "");
    const needsEscaping = /[",\n]/.test(stringValue);
    if (!needsEscaping) return stringValue;
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const rows = transactions.map((tx) => [
    tx.type,
    `${tx.amount} ${tx.asset}`,
    tx.status,
    tx.date,
    tx.hash,
  ].map(escapeValue).join(","));

  return [headers.join(","), ...rows].join("\r\n");
}

/**
 * Renders the recent transaction history with virtualized rows and CSV export.
 */
export function TransactionList() {
  const { connected, address } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65, // Approx height of each table row
    overscan: 5,
  });

  useEffect(() => {
    async function loadHistory() {
      if (!connected || !address) return;
      setLoading(true);
      try {
        const history = await fetchTransactionHistory(address);
        setTransactions(history);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [connected, address]);

  const handleDownloadCsv = useCallback(() => {
    if (!transactions.length) return;

    const csvContent = buildTransactionCsv(transactions);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "xh-edge-transactions.csv");
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [transactions]);

  if (!connected) return null;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm mt-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Recent Activity</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownloadCsv}
          disabled={loading || transactions.length === 0}
          aria-label="Download transaction history as CSV"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download CSV</span>
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">
            Loading activity...
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent activity found.
          </div>
        ) : (
          <div
            ref={parentRef}
            className="overflow-x-auto overflow-y-auto max-h-[400px] relative w-full border rounded-md"
          >
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b text-sm text-muted-foreground shadow-sm">
                  <th className="py-2 px-4 font-medium">Type</th>
                  <th className="py-2 px-4 font-medium">Amount</th>
                  <th className="py-2 px-4 font-medium">Status</th>
                  <th className="py-2 px-4 font-medium">Date</th>
                  <th className="py-2 px-4 font-medium">Transaction Hash</th>
                </tr>
              </thead>
              <tbody
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const tx = transactions[virtualRow.index];
                  return (
                    <tr
                      key={virtualRow.key}
                      className="border-b hover:bg-muted/50 transition-colors absolute w-full"
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                        top: 0,
                        left: 0,
                      }}
                    >
                      <td className="py-4 px-4 w-[15%]">
                        <div className="flex items-center gap-2">
                          {tx.type === "deposit" ? (
                            <ArrowUpFromLine className="w-4 h-4 text-green-500" />
                          ) : (
                            <ArrowDownToLine className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="capitalize font-medium">{tx.type}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono w-[20%]">
                        {formatNumber(parseFloat(tx.amount))} {tx.asset}
                      </td>
                      <td className="py-4 px-4 w-[20%]">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.status === "success" ? "bg-green-500/10 text-green-500" :
                          tx.status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
                            "bg-red-500/10 text-red-500"
                          }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground w-[20%]">
                        {tx.date}
                      </td>
                      <td className="py-4 px-4 w-[25%]">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                          <Hash className="w-3 h-3" />
                          <span>{tx.hash}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
