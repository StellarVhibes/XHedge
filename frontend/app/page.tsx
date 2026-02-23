import { AiInsightStream } from "./components/AiInsightStream";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-24">
      <h1 className="text-4xl font-bold">XHedge</h1>
      <p className="text-xl">Volatility Shield for Weak Currencies</p>
      <div className="p-4 border rounded-lg bg-card">
        <p className="text-muted-foreground">Frontend scaffolded successfully.</p>
        <p className="text-sm mt-2">See <code>docs/ISSUES-FRONTEND.md</code> to start building.</p>
      </div>
      <AiInsightStream />
    </main>
  );
}
