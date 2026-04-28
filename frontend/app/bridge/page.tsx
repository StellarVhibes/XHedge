'use client';

import { Shield, ArrowRight, History } from 'lucide-react';
import { useTranslations } from '@/lib/i18n-context';
import { WalletButton } from '../components/WalletButton';
import { BridgeForm } from '@/components/bridge/BridgeForm';
import { TransactionMonitor } from '@/components/bridge/TransactionMonitor';
import { useState } from 'react';
import { BridgeTransaction } from '@/lib/bridge';

export default function BridgePage() {
    const t = useTranslations('Bridge');
    const [activeTransactions, setActiveTransactions] = useState<BridgeTransaction[]>([]);

    const handleTransactionInitiated = (tx: BridgeTransaction) => {
        setActiveTransactions((prev) => [tx, ...prev]);
    };

    return (
        <div className="min-h-screen md:p-8">
            <div className="mx-auto max-w-4xl space-y-8">
                <div className="flex items-center justify-between max-md:flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <Shield className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
                            <p className="text-muted-foreground">{t('description')}</p>
                        </div>
                    </div>
                    <WalletButton />
                </div>

                <div className="grid gap-8 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <BridgeForm onTransactionInitiated={handleTransactionInitiated} />
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-2xl border bg-card p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <History className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold">{t('monitor.title')}</h2>
                            </div>
                            <TransactionMonitor transactions={activeTransactions} />
                        </div>

                        <div className="rounded-2xl border bg-card p-6 shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
                            <h3 className="font-semibold mb-2">Bridge Information</h3>
                            <ul className="text-sm space-y-2 text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                    <span>Powered by Allbridge Core for institutional-grade reliability.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                    <span>Estimated time varies by source network (Stellar is typically &lt; 3 mins).</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                    <span>Transfer fees are deducted from the bridging amount.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
