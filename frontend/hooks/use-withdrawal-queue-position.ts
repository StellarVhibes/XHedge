"use client";

import { useState, useEffect, useCallback } from "react";
import { Address, scValToNative } from "@stellar/stellar-sdk";
import { rpc } from "@stellar/stellar-sdk";
import { getVolatilityShieldAddress } from "@/lib/contracts.config";
import { useNetwork } from "@/app/context/NetworkContext";
import { useWallet } from "@/hooks/use-wallet";

export interface QueuedWithdrawalData {
  user: string;
  asset: string;
  shares: string;
  timestamp: string;
}

export interface UseWithdrawalQueuePositionResult {
  position: number | null; // Position in queue (0-based index), null if not in queue
  estimatedWaitTime: number | null; // Estimated wait time in seconds
  queueLength: number; // Total number of queued withdrawals
  isProcessing: boolean; // Whether withdrawals are currently being processed
  refresh: () => void; // Manual refresh function
}

export function useWithdrawalQueuePosition(
  userAddress: string | null
): UseWithdrawalQueuePositionResult {
  const { network } = useNetwork();
  const { address: walletAddress } = useWallet();
  const [position, setPosition] = useState<number | null>(null);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number | null>(null);
  const [queueLength, setQueueLength] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const actualUserAddress = userAddress || walletAddress;

  const fetchQueuePosition = useCallback(async () => {
    if (!actualUserAddress) {
      setPosition(null);
      setEstimatedWaitTime(null);
      setQueueLength(0);
      setIsProcessing(false);
      return;
    }

    try {
      const contractAddress = getVolatilityShieldAddress(network);
      const rpcUrl = network === "mainnet"
        ? "https://rpc.mainnet.stellar.org"
        : network === "futurenet"
          ? "https://rpc-futurenet.stellar.org"
          : "https://rpc.testnet.stellar.org";

      const server = new rpc.Server(rpcUrl);
      const contract = new rpc.Contract(contractAddress);

      // Call get_pending_withdrawals to get the full queue
      const pendingWithdrawalsCall = contract.call("get_pending_withdrawals");
      const sourceAccount = await server.loadAccount(actualUserAddress);

      const transaction = new rpc.TransactionBuilder(sourceAccount, {
        fee: "100",
        networkPassphrase:
          network === "mainnet"
            ? Networks.PUBLIC
            : network === "futurenet"
              ? "Test SDF Future Network ; October 2022"
              : Networks.TESTNET,
      })
        .addOperation(pendingWithdrawalsCall)
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(transaction);

      if (!("error" in simulated) && simulated.result) {
        const nativeResult = scValToNative(simulated.result.retval);
        if (Array.isArray(nativeResult)) {
          const queue: QueuedWithdrawalData[] = nativeResult.map((item: any) => ({
            user: item.user?.toString() || "",
            asset: item.asset?.toString() || "",
            shares: item.shares?.toString() || "0",
            timestamp: item.timestamp?.toString() || "0",
          }));

          // Find user's position in queue (0-based index)
          const userPosition = queue.findIndex(
            (withdrawal) => withdrawal.user === actualUserAddress
          );

          setPosition(userPosition >= 0 ? userPosition : null);
          setQueueLength(queue.length);

          // Estimate wait time based on position and average processing time
          // Assuming ~30 seconds per withdrawal for estimation
          const estimatedWaitSeconds =
            userPosition >= 0 ? userPosition * 30 : null;
          setEstimatedWaitTime(estimatedWaitSeconds);

          // Check if processing is active (simplified - in reality would check recent events)
          setIsProcessing(queue.length > 0);
        } else {
          setPosition(null);
          setEstimatedWaitTime(null);
          setQueueLength(0);
          setIsProcessing(false);
        }
      } else {
        setPosition(null);
        setEstimatedWaitTime(null);
        setQueueLength(0);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error fetching withdrawal queue position:", error);
      setPosition(null);
      setEstimatedWaitTime(null);
      setQueueLength(0);
      setIsProcessing(false);
    }
  }, [actualUserAddress, network]);

  useEffect(() => {
    fetchQueuePosition();
  }, [actualUserAddress, network, fetchQueuePosition]);

  return {
    position,
    estimatedWaitTime,
    queueLength,
    isProcessing,
    refresh: fetchQueuePosition,
  };
}