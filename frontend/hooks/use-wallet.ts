"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  isConnected, 
  getPublicKey,
  signTransaction,
  getNetwork,
  requestAccess
} from "@stellar/freighter-api";

export interface WalletState {
  connected: boolean;
  address: string | null;
  network: string | null;
  loading: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    network: null,
    loading: true,
    error: null,
  });

  const checkConnection = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    
    try {
      const connected = await isConnected();
      
      if (connected) {
        let publicKey = await getPublicKey();
        
        if (!publicKey) {
          publicKey = await requestAccess();
        }
        
        if (publicKey) {
          const network = await getNetwork();
          
          setState({
            connected: true,
            address: publicKey,
            network: network || null,
            loading: false,
            error: null,
          });
        } else {
          setState({
            connected: false,
            address: null,
            network: null,
            loading: false,
            error: "Failed to get wallet address",
          });
        }
      } else {
        setState({
          connected: false,
          address: null,
          network: null,
          loading: false,
          error: "Freighter wallet not installed",
        });
      }
    } catch (error) {
      setState({
        connected: false,
        address: null,
        network: null,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const signTx = useCallback(async (xdr: string, networkPassphrase: string) => {
    try {
      const result = await signTransaction(xdr, {
        networkPassphrase,
      });
      
      if (typeof result === "string") {
        return { error: null, signedTxXdr: result };
      }
      
      return { error: "Failed to sign transaction", signedTxXdr: null };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : "Failed to sign transaction", 
        signedTxXdr: null 
      };
    }
  }, []);

  return {
    ...state,
    checkConnection,
    signTransaction: signTx,
  };
}
