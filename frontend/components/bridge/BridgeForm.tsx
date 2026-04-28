'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n-context';
import { ArrowDown, RefreshCw, AlertCircle, Info, ArrowRightCircle } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';
import {
    SUPPORTED_CHAINS,
    SUPPORTED_ASSETS,
    estimateBridgeTransaction,
    initiateBridgeTransaction,
    BridgeEstimation,
    BridgeTransaction
} from '@/lib/bridge';

interface BridgeFormProps {
    onTransactionInitiated: (tx: BridgeTransaction) => void;
}

export function BridgeForm({ onTransactionInitiated }: BridgeFormProps) {
    const t = useTranslations('Bridge');
    const commonT = useTranslations('Common');
    const { connected, address } = useWallet();

    const [sourceChain, setSourceChain] = useState(SUPPORTED_CHAINS[0].id);
    const [destChain, setDestChain] = useState(SUPPORTED_CHAINS[SUPPORTED_CHAINS.length - 1].id);
    const [asset, setAsset] = useState(SUPPORTED_ASSETS[0].id);
    const [amount, setAmount] = useState('');

    const [loading, setLoading] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [estimation, setEstimation] = useState<BridgeEstimation | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEstimate = async () => {
            if (!amount || parseFloat(amount) <= 0) {
                setEstimation(null);
                setError(null);
                return;
            }

            setEstimating(true);
            setError(null);
            try {
                const est = await estimateBridgeTransaction(sourceChain, destChain, asset, amount);
                setEstimation(est);
            } catch (err: any) {
                setError(err.message || 'Error estimating transaction');
                setEstimation(null);
            } finally {
                setEstimating(false);
            }
        };

        const timer = setTimeout(fetchEstimate, 500);
        return () => clearTimeout(timer);
    }, [sourceChain, destChain, asset, amount]);

    const handleSwitchChains = () => {
        const oldSource = sourceChain;
        setSourceChain(destChain);
        setDestChain(oldSource);
    };

    const handleBridge = async () => {
        if (!connected || !address || !amount || !estimation) return;

        setLoading(true);
        setError(null);
        try {
            const txId = await initiateBridgeTransaction(sourceChain, destChain, asset, amount, address);

            const newTx: BridgeTransaction = {
                id: txId,
                sourceChain,
                destinationChain: destChain,
                asset,
                amount,
                status: 'pending',
                timestamp: new Date().toISOString(),
            };

            onTransactionInitiated(newTx);
            setAmount('');
            setEstimation(null);
        } catch (err: any) {
            setError(err.message || 'Bridge transaction failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-2xl border bg-card p-6 shadow-md border-primary/20 bg-gradient-to-b from-card to-card/50">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-4">
                        {t('form.sourceChain')}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SUPPORTED_CHAINS.map((chain) => (
                            <button
                                key={chain.id}
                                onClick={() => setSourceChain(chain.id)}
                                className={`p-3 rounded-xl border text-sm font-medium transition-all ${sourceChain === chain.id
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border hover:bg-muted/50 text-muted-foreground'
                                    }`}
                            >
                                {chain.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-center -my-3 relative z-10">
                    <button
                        onClick={handleSwitchChains}
                        className="p-3 bg-card border rounded-full hover:bg-muted transition-colors shadow-sm"
                    >
                        <ArrowDown className="w-5 h-5 text-primary" strokeWidth={3} />
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-4">
                        {t('form.destinationChain')}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SUPPORTED_CHAINS.map((chain) => (
                            <button
                                key={chain.id}
                                onClick={() => setDestChain(chain.id)}
                                className={`p-3 rounded-xl border text-sm font-medium transition-all ${destChain === chain.id
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border hover:bg-muted/50 text-muted-foreground'
                                    }`}
                            >
                                {chain.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                            {t('form.asset')}
                        </label>
                        <select
                            value={asset}
                            onChange={(e) => setAsset(e.target.value)}
                            className="w-full p-4 rounded-xl border bg-background text-foreground"
                        >
                            {SUPPORTED_ASSETS.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.symbol} - {a.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                            {t('form.amount')}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full p-4 rounded-xl border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-12"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                                {SUPPORTED_ASSETS.find(a => a.id === asset)?.symbol}
                            </span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {estimating && (
                    <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-center gap-3 italic text-sm text-muted-foreground">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Calculating optimal route and fees...</span>
                    </div>
                )}

                {estimation && !estimating && !error && (
                    <div className="p-5 rounded-xl bg-primary/5 border border-primary/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                                <Info className="w-4 h-4" /> {t('form.estimate')}
                            </span>
                            <span className="font-semibold text-primary">{estimation.time}</span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('form.estimatedFee')}</span>
                                <span className="font-medium text-foreground">{estimation.fee} {SUPPORTED_ASSETS.find(a => a.id === asset)?.symbol}</span>
                            </div>
                            <div className="flex justify-between items-end pt-2 border-t border-border">
                                <span className="text-muted-foreground text-xs uppercase tracking-wide font-bold">You will receive approx.</span>
                                <span className="text-xl font-bold text-foreground">{estimation.receiveAmount} {SUPPORTED_ASSETS.find(a => a.id === asset)?.symbol}</span>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleBridge}
                    disabled={loading || estimating || !amount || !!error || !connected}
                    className={`w-full p-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${loading || estimating || !amount || !!error || !connected
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-primary text-primary-foreground hover:scale-[1.01] hover:shadow-lg active:scale-100'
                        }`}
                >
                    {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                        <ArrowRightCircle className="w-5 h-5" />
                    )}
                    {connected ? t('form.bridgeAction') : commonT('wallet.connect')}
                </button>
            </div>
        </div>
    );
}
