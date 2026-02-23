"use client";

import { WithdrawForm } from "@/components/withdraw-form";
import { Shield, ArrowDownToLine, Info } from "lucide-react";

export default function VaultPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Vault</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your XHedge vault positions
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <ArrowDownToLine className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Withdraw Funds</h2>
          </div>
          <WithdrawForm />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium">How it works</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>1. Enter the amount you wish to withdraw</li>
              <li>2. Click "Withdraw" to build the transaction</li>
              <li>3. Approve the transaction in your Freighter wallet</li>
              <li>4. Your funds will be returned to your wallet</li>
            </ul>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-medium mb-3">Important Notes</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Withdrawals are processed on-chain</li>
              <li>• A small network fee applies</li>
              <li>• Funds are returned to the connected wallet</li>
              <li>• Withdrawal amounts are based on your share of the vault</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
