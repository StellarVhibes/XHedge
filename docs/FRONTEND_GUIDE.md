# Stellar Frontend Integration Guide: Connecting to Soroban 🌐

This guide covers how to build a modern frontend that interacts with Stellar smart contracts (Soroban). We will focus on using the **Freighter Wallet** and the **Stellar SDK**.

---

## 1. The Stack 🥞

To build a robust Stellar dApp, you'll typically use:
- **Frontend Framework:** Next.js (React) is standard.
- **Wallet Connection:** `@stellar/freighter-api`.
- **Blockchain Interaction:** `@stellar/stellar-sdk` (handles XDR encoding/decoding and RPC calls).
- **Network:** Futurenet or Testnet (during development).

---

## 2. Installation 📦

Add the necessary packages to your project:
```bash
npm install @stellar/freighter-api @stellar/stellar-sdk
```

### 2.1 Prerequisites: Funding Your Test Wallet 💸

Before you can send any transaction, your Freighter wallet needs testnet XLM.

1.  Open Freighter and switch to **Testnet**.
2.  Copy your wallet address.
3.  Go to the [Stellar Laboratory Account Creator](https://laboratory.stellar.org/#account-creator?network=test).
4.  Paste your address into the "Friendbot" section and click "Get Test Network XLM".

---

## 3. Wallet Connection (Freighter) 👛

Freighter is the "MetaMask" of Stellar. You need to check if it's installed and request access.

### Hook: `useFreighter.ts`
```typescript
import { isConnected, requestAccess, setAllowed } from "@stellar/freighter-api";
import { useState, useEffect } from "react";

export function useFreighter() {
  const [address, setAddress] = useState<string>("");
  
  // Check if connected on mount
  useEffect(() => {
    async function checkConnection() {
      const connected = await isConnected();
      if (connected) {
        const addr = await requestAccess(); // Returns address if already allowed
        if (addr) setAddress(addr);
      }
    }
    checkConnection();
  }, []);

  const connect = async () => {
    if (!await isConnected()) {
      alert("Please install Freighter!");
      return;
    }
    const addr = await requestAccess();
    if (addr) {
      await setAllowed();
      setAddress(addr);
    }
  };

  return { address, connect };
}
```

---

## 4. Invoking Smart Contracts 📝

Interacting with a contract involves three steps:
1.  **Build Transaction:** Create an operation to invoke the contract function.
2.  **Sign:** Request the user to sign it via Freighter.
3.  **Submit:** Send the signed transaction (XDR) to the Soroban RPC.

### Example: Calling `hello(to: Symbol)`

```typescript
import { 
  Contract, 
  TransactionBuilder, 
  SorobanRpc, 
  xdr, 
  TimeoutInfinite 
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

const CONTRACT_ID = "C..."; // Your deployed contract ID
const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

async function callHello(userAddress: string, toWho: string) {
  const server = new SorobanRpc.Server(RPC_URL);
  
  // 1. Get latest ledger info for sequence number
  const account = await server.getAccount(userAddress);
  
  // 2. Build the contract call
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, { 
    fee: "100", 
    networkPassphrase: NETWORK_PASSPHRASE 
  })
  .addOperation(contract.call("hello", [
    xdr.ScVal.scvSymbol(toWho) // Arguments must be XDR encoded
  ]))
  .setTimeout(TimeoutInfinite)
  .build();

  // 3. Prepare Transaction (Simulate first!)
  // Simulation estimates fees and checks for errors before user signs
  const sim = await server.simulateTransaction(tx);
  if (!SorobanRpc.isSimulationSuccess(sim)) {
    throw new Error("Simulation failed");
  }

  // 4. Assemble the final transaction data from simulation
  const preparedTx = SorobanRpc.assembleTransaction(tx, sim);

  // 5. Sign with Freighter
  const signedXdr = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE
  });

  // 6. Submit to Network
  const result = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  );

  if (result.status !== "PENDING") {
    console.error("Submission failed", result);
    return;
  }

  // 7. Wait for Confirmation
  // (You would poll getTransactionStatus here)
  console.log("Transaction Hash:", result.hash);
}
```

---

## 5. Reading State (Read-Only) 📖

You don't need a wallet signature to read data. You can use the RPC directly.

```typescript
async function readContractData() {
  const server = new SorobanRpc.Server(RPC_URL);
  const contract = new Contract(CONTRACT_ID);

  // We "simulate" a transaction to read the return value
  // We use a random source because we aren't spending money
  const tx = new TransactionBuilder(
    new Account("G...", "0"), 
    { fee: "100", networkPassphrase: NETWORK_PASSPHRASE }
  )
  .addOperation(contract.call("get_count")) // e.g. function get_count()
  .build();

  const sim = await server.simulateTransaction(tx);
  
  if (SorobanRpc.isSimulationSuccess(sim)) {
    // Decode the result
    const result = sim.result.retval;
    console.log("Current Count:", result.u32()); // Decode XDR
  }
}
```

---

## 6. Generated Client Bindings (The Easy Way) ✨

The `soroban-cli` can generate TypeScript bindings for your contract, saving you from manually encoding XDR.

```bash
soroban contract bindings typescript \
  --wasm ./target/wasm32-unknown-unknown/release/hello.wasm \
  --id <CONTRACT_ID> \
  --output-dir ./packages/hello
```

Now you can import the client directly!
```typescript
import { Client } from "./packages/hello";

const client = new Client({ networkPassphrase, rpcUrl });
const result = await client.hello({ to: "World" });
```

---

## 7. Checklist for Integration ✅

- [ ] **Network Config:** Ensure your app points to the right RPC (Testnet vs Mainnet).
- [ ] **Passphrase:** Use the correct Network Passphrase.
- [ ] **Simulation:** ALWAYS simulate before asking the user to sign. It catches errors early and calculates gas.
- **XDR:** Familiarize yourself with Stellar's data format (XDR) if you aren't using generated bindings.

---
*Ready to build the future of finance? 🚀*
