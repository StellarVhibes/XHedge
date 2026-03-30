"use client";

import { useEffect, useRef, useState } from 'react';
import { rpc, scValToNative } from "@stellar/stellar-sdk";
import { NetworkType, useNetwork } from "@/app/context/NetworkContext";
import { useWallet } from "@/hooks/use-wallet";
import { getVolatilityShieldAddress } from "@/lib/contracts.config";

export interface SorobanEvent {
  id: string;
  type: "Deposit" | "Withdraw" | "Rebalance" | "Other";
  contractId: string;
  topic: string[];
  value: any;
  ledger: string;
}

const RPC_URLS: Record<NetworkType, string> = {
  [NetworkType.MAINNET]: "https://rpc.mainnet.stellar.org",
  [NetworkType.TESTNET]: "https://rpc.testnet.stellar.org",
  [NetworkType.FUTURENET]: "https://rpc-futurenet.stellar.org",
};

export function useSorobanEvents(callback: (event: SorobanEvent) => void) {
  const { network } = useNetwork();
  const { address } = useWallet();
  const lastLedgerRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!address) return;

    const contractId = getVolatilityShieldAddress(network);
    const rpcUrl = RPC_URLS[network];
    const server = new rpc.Server(rpcUrl);

    const pollEvents = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        // If we don't have a starting ledger, get the latest one
        if (lastLedgerRef.current === null) {
          const info = await server.getLatestLedger();
          lastLedgerRef.current = info.sequence;
          isPollingRef.current = false;
          return;
        }

        const startLedger = lastLedgerRef.current + 1;
        const response = await server.getEvents({
          startLedger,
          filters: [
            {
              type: "contract",
              contractIds: [contractId],
            },
          ],
        });

        if (response.events && response.events.length > 0) {
          // Update the last seen ledger based on the latest event
          const maxLedger = Math.max(...response.events.map(e => e.ledger));
          lastLedgerRef.current = maxLedger;

          response.events.forEach((e) => {
            const topics = e.topic.map(t => {
                try {
                    return scValToNative(t);
                } catch {
                    return "unknown";
                }
            });
            const eventName = topics[0];
            
            // Only trigger for interesting events and if related to the user (if possible to determine)
            // Note: Soroban events might not always include user address in topics depending on implementation
            if (["Deposit", "Withdraw", "Rebalance"].includes(eventName)) {
              callback({
                id: e.id,
                type: eventName as any,
                contractId: String(e.contractId),
                topic: topics,
                value: scValToNative(e.value),
                ledger: e.ledger.toString(),
              });
            }
          });
        } else {
            // If no events, still update to current latest ledger to avoid re-scanning old ones
            const info = await server.getLatestLedger();
            lastLedgerRef.current = info.sequence;
        }
      } catch (error) {
        console.error("Failed to fetch Soroban events:", error);
      } finally {
        isPollingRef.current = false;
      }
    };

    const interval = setInterval(pollEvents, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [address, network, callback]);
}
