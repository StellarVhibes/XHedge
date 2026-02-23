export default function Home() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to XHedge - Your Volatility Shield
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Total Value Locked</span>
            <span className="text-2xl font-bold">$1,234,567</span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Active Strategies</span>
            <span className="text-2xl font-bold">12</span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Your Shares</span>
            <span className="text-2xl font-bold">1,000 XHS</span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">APY</span>
            <span className="text-2xl font-bold text-primary">8.5%</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
            Deposit
          </button>
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
            Withdraw
          </button>
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
            View Strategies
          </button>
        </div>
      </div>
    </div>
  );
}
