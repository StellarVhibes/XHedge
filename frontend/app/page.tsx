"use client";
import React, { useEffect, useState } from 'react';
import AllocationChart from '../components/AllocationChart';

type Slice = { name: string; value: number; color?: string };

export default function Home() {
  const [slices, setSlices] = useState<Slice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch('/api/allocation')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.slices) setSlices(data.slices);
        else setError('No allocation data available');
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12">
      <h1 className="text-4xl font-bold">XHedge 🛡️</h1>
      <p className="mt-2 text-lg">Volatility Shield — Current Deployment Allocation</p>

      <div className="mt-8 p-6 border rounded-lg bg-card w-full max-w-2xl">
        {loading && <p>Loading allocation…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && slices && (
          <div className="flex flex-col items-center gap-6">
            <AllocationChart slices={slices} />
          </div>
        )}

        {!loading && !error && !slices && (
          <p className="text-muted-foreground">No allocation data found.</p>
        )}

        <p className="text-sm mt-4">See <a href="/docs/ISSUES-FRONTEND.md" className="underline">docs/ISSUES-FRONTEND.md</a> to continue development.</p>
      </div>
    </main>
  );
}
