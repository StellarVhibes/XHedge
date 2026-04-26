'use client';

import { useEffect, useCallback, useMemo } from 'react';
import {
  ArrowUpFromLine,
  ArrowDownToLine,
  Clock,
  Hash,
  Download,
} from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';
import { Transaction, fetchTransactionHistory } from '@/lib/stellar';
import { formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import ReactTableVirtualized from '@/app/components/VirtualizedTable';
import { useStaleData } from '@/hooks/use-stale-data';
import { StaleBadge } from '@/components/StaleBadge';
import { TransactionListSkeleton } from '@/components/ui/skeleton';

/**
 * Builds a CSV string from a list of transactions, mirroring the UI table columns.
 *
 * @param transactions - The list of transactions to serialize.
 * @returns CSV content as a string.
 */
function buildTransactionCsv(transactions: Transaction[]): string {
  const headers = ['Type', 'Amount', 'Status', 'Date', 'Transaction Hash'];

  const escapeValue = (value: string | number) => {
    const stringValue = String(value ?? '');
    const needsEscaping = /[",\n]/.test(stringValue);
    if (!needsEscaping) return stringValue;
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const rows = transactions.map((tx) =>
    [tx.type, `${tx.amount} ${tx.asset}`, tx.status, tx.date, tx.hash]
      .map(escapeValue)
      .join(','),
  );

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Renders the recent transaction history with virtualized rows and CSV export.
 */
export function TransactionList() {
  const { connected, address } = useWallet();
  const { state, setData, setLoading, setError } = useStaleData<Transaction[]>(5 * 60 * 1000);
  const transactions = state.data ?? [];

  const loadHistory = useCallback(async () => {
    if (!connected || !address) return;
    setLoading(true);
    try {
      const history = await fetchTransactionHistory(address);
      setData(history);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load transactions');
    }
  }, [connected, address, setData, setLoading, setError]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDownloadCsv = useCallback(() => {
    if (!transactions.length) return;

    const csvContent = buildTransactionCsv(transactions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'xh-edge-transactions.csv');
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [transactions]);

  const columns = useMemo<Array<ColumnDef<any>>>(
    () => [
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.type === 'deposit' ? (
              <ArrowUpFromLine className="w-4 h-4 text-green-500" />
            ) : (
              <ArrowDownToLine className="w-4 h-4 text-blue-500" />
            )}
            <span className="capitalize font-medium">{row.original.type}</span>
          </div>
        ),
      },
      {
        accessorKey: 'Amount',
        cell: ({ row }) => (
          <div className="font-mono">
            {formatNumber(parseFloat(row.original.amount))} {row.original.asset}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                row.original.status === 'success'
                  ? 'bg-green-500/10 text-green-500'
                  : row.original.status === 'pending'
                    ? 'bg-yellow-500/10 text-yellow-500'
                    : 'bg-red-500/10 text-red-500'
              }`}
            >
              {row.original.status}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.date}
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Transaction Hash',
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors">
            <Hash className="w-3 h-3" />
            <span>{row.original.hash}</span>
          </div>
        ),
      },
    ],
    [],
  );

  if (!connected) return null;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm mt-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Recent Activity</h2>
        </div>
        <div className="flex items-center gap-2">
          <StaleBadge
            lastFetchedAt={state.lastFetchedAt}
            isStale={state.isStale}
            onRefresh={loadHistory}
            refreshing={state.loading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            disabled={state.loading || transactions.length === 0}
            aria-label="Download transaction history as CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download CSV</span>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {state.loading ? (
          <TransactionListSkeleton rows={3} />
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent activity found.
          </div>
        ) : (
          <ReactTableVirtualized columns={columns} data={transactions} />
        )}
      </div>
    </div>
  );
}
