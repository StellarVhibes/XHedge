'use client';

import { useEffect, useCallback, useMemo, useState } from 'react';
import {
  ArrowUpFromLine,
  ArrowDownToLine,
  Clock,
  Hash,
  Download,
  Search,
  X,
} from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';
import { useNetwork } from '@/app/context/NetworkContext';
import { Transaction, fetchTransactionHistory } from '@/lib/stellar';
import { getVolatilityShieldAddress } from '@/lib/contracts.config';
import { formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ColumnDef } from '@tanstack/react-table';
import ReactTableVirtualized from '@/app/components/VirtualizedTable';
import { useStaleData } from '@/hooks/use-stale-data';
import { StaleBadge } from '@/components/StaleBadge';
import { TransactionListSkeleton } from '@/components/ui/skeleton';

const TX_TYPES = ['All', 'Deposit', 'Withdraw', 'Harvest', 'Rebalance'] as const;
type TxTypeFilter = (typeof TX_TYPES)[number];

function buildTransactionCsv(transactions: Transaction[]): string {
  const headers = ['Type', 'Amount', 'Status', 'Date', 'Transaction Hash'];
  const escapeValue = (value: string | number) => {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = transactions.map((tx) =>
    [tx.type, `${tx.amount} ${tx.asset}`, tx.status, tx.date, tx.hash]
      .map(escapeValue)
      .join(','),
  );
  return [headers.join(','), ...rows].join('\r\n');
}

export function TransactionList() {
  const { connected, address } = useWallet();
  const { network } = useNetwork();
  const { state, setData, setLoading, setError } = useStaleData<Transaction[]>(5 * 60 * 1000);
  const transactions = state.data ?? [];

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>('All');

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (typeFilter !== 'All') {
      result = result.filter(
        (tx) => tx.type.toLowerCase() === typeFilter.toLowerCase(),
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (tx) =>
          tx.hash.toLowerCase().includes(q) ||
          tx.type.toLowerCase().includes(q),
      );
    }
    return result;
  }, [transactions, search, typeFilter]);

  const hasActiveFilter = search.trim() !== '' || typeFilter !== 'All';

  const clearFilters = useCallback(() => {
    setSearch('');
    setTypeFilter('All');
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!connected || !address || !network) return;
    setLoading(true);
    try {
      const contractId = getVolatilityShieldAddress(network);
      const history = await fetchTransactionHistory(contractId, address, network);
      setData(history);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load transactions');
    }
  }, [connected, address, network, setData, setLoading, setError]);

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

  const columns = useMemo<Array<ColumnDef<Transaction>>>(
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
        accessorKey: 'amount',
        header: 'Amount',
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
        ),
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">{row.original.date}</div>
        ),
      },
      {
        accessorKey: 'hash',
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
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
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

      {/* Search + type filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4" data-testid="tx-filter-bar">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search by hash or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search transactions"
            data-testid="tx-search-input"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TxTypeFilter)}
          className="h-10 rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Filter by transaction type"
          data-testid="tx-type-filter"
        >
          {TX_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {hasActiveFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            aria-label="Clear filters"
            data-testid="tx-clear-filters"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="space-y-4">
        {state.loading ? (
          <TransactionListSkeleton rows={3} />
        ) : filteredTransactions.length === 0 ? (
          <div
            className="text-center py-8 text-muted-foreground"
            data-testid="tx-no-results"
          >
            {hasActiveFilter ? 'No transactions match your filters.' : 'No recent activity found.'}
          </div>
        ) : (
          <ReactTableVirtualized columns={columns} data={filteredTransactions} />
        )}
      </div>
    </div>
  );
}
