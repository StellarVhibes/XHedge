import { useState, useEffect } from "react";

export interface AssetPrices {
    XLM: number;
    USDC: number;
    [key: string]: number;
}

export function usePriceTracker(intervalMs: number = 60000) {
    const [prices, setPrices] = useState<AssetPrices>({ XLM: 0, USDC: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchPrices = async () => {
            try {
                const response = await fetch(
                    "https://api.coingecko.com/api/v3/simple/price?ids=stellar,usd-coin&vs_currencies=usd"
                );
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                if (isMounted) {
                    setPrices(prev => ({
                        ...prev,
                        XLM: data.stellar?.usd || prev.XLM,
                        USDC: data["usd-coin"]?.usd || prev.USDC,
                    }));
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Failed to fetch prices:", err);
                    setError("Failed to fetch latest prices.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, intervalMs);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [intervalMs]);

    return { prices, loading, error };
}
