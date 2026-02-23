"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DepositForm } from "@/components/deposit-form";
import { WithdrawForm } from "@/components/withdraw-form";
import { Shield, ArrowUpFromLine, ArrowDownToLine, Info } from "lucide-react";

type Tab = "deposit" | "withdraw";

export default function VaultPage() {
  const [activeTab, setActiveTab] = useState<Tab>("deposit");

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
          <div className="flex border-b mb-6">
            <button
              onClick={() => setActiveTab("deposit")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 font-medium transition-colors",
                activeTab === "deposit"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowUpFromLine className="w-4 h-4" />
              Deposit
            </button>
            <button
              onClick={() => setActiveTab("withdraw")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 font-medium transition-colors",
                activeTab === "withdraw"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowDownToLine className="w-4 h-4" />
              Withdraw
            </button>
          </div>

          {activeTab === "deposit" ? (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <ArrowUpFromLine className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Deposit Funds</h2>
              </div>
              <DepositForm />
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <ArrowDownToLine className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Withdraw Funds</h2>
              </div>
              <WithdrawForm />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium">How it works</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>1. Enter the amount you wish to {activeTab}</li>
              <li>2. Click "{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}" to build the transaction</li>
              <li>3. Approve the transaction in your Freighter wallet</li>
              <li>4. Your transaction will be submitted to the network</li>
            </ul>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-medium mb-3">Important Notes</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• All transactions are processed on-chain</li>
              <li>• A small network fee applies</li>
              <li>• Funds are managed by the smart contract</li>
              <li>• {activeTab === "deposit" ? "You will receive vault shares" : "You will receive the underlying asset"}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
