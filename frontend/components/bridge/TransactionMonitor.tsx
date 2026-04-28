'use client';

import { useTranslations } from '@/lib/i18n-context';
import { RefreshCw, CheckCircle2, Clock, XCircle, ExternalLink } from 'lucide-react';
import { BridgeTransaction, SUPPORTED_CHAINS, SUPPORTED_ASSETS, getStatusLabel } from '@/lib/bridge';

interface TransactionMonitorProps {
    transactions: BridgeTransaction[];
}

export function TransactionMonitor({ transactions }: TransactionMonitorProps) {
    const t = useTranslations('Bridge');

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Clock className="w-10 h-10 mb-4 opacity-20" />
                <p className="text-sm font-medium">{t('monitor.noTransactions')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {transactions.map((tx) => {
                const sourceChain = SUPPORTED_CHAINS.find(c => c.id === tx.sourceChain)?.name;
                const destChain = SUPPORTED_CHAINS.find(c => c.id === tx.destinationChain)?.name;
                const asset = SUPPORTED_ASSETS.find(a => a.id === tx.asset)?.symbol;

                const StatusIcon = {
                    pending: <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />,
                    confirming: <Clock className="w-4 h-4 text-blue-500" />,
                    completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
                    failed: <XCircle className="w-4 h-4 text-red-500" />,
                }[tx.status] || <Clock className="w-4 h-4" />;

                return (
                    <div key={tx.id} className="p-4 rounded-xl border bg-muted/20 relative group transition-all hover:bg-muted/30">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="p-1 rounded bg-background border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{sourceChain}</span>
                                <span className="text-muted-foreground text-xs">→</span>
                                <span className="p-1 rounded bg-background border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{destChain}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background border text-[10px] font-bold uppercase tracking-widest text-foreground shadow-sm group-hover:bg-primary/5">
                                {StatusIcon}
                                <span className={
                                    tx.status === 'completed' ? 'text-green-500' :
                                        tx.status === 'failed' ? 'text-red-500' : 'text-foreground'
                                }>
                                    {getStatusLabel(tx.status)}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-lg font-bold text-foreground">
                                    {tx.amount} <span className="text-xs font-medium text-muted-foreground">{asset}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {new Date(tx.timestamp).toLocaleString()}
                                </div>
                            </div>

                            <button
                                className="p-1.5 rounded-lg border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                title={t('monitor.viewOnExplorer')}
                            >
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
