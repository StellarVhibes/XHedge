# XHedge Smart Contract Upgrade Guide

This document outlines the standard procedure for upgrading the XHedge volatility shield contract on the Stellar network using Soroban's built-in `update_current_contract_wasm` mechanism.

## Overview
Soroban smart contracts are immutable by default, but their executable WASM code can be updated if the contract includes a method that calls `env.deployer().update_current_contract_wasm()`. The `VolatilityShield` contract includes the `upgrade` and `migrate` methods for this purpose. 

## Procedure

1. **Write and Test V2 code**
   Develop the new features or fixes for the contract (V2). Make sure to increment the expected version in `version` checks or handle migrations appropriately in the `migrate` function.

2. **Compile the new WASM**
   Compile the new smart contract to a `.wasm` file.
   ```bash
   cd smartcontract && cargo build --target wasm32-unknown-unknown --release
   ```

3. **Install the new WASM on-chain**
   Install the compiled WASM to the Stellar network to obtain its `wasm_hash`.
   ```bash
   stellar contract install --wasm target/wasm32-unknown-unknown/release/volatility_shield.wasm --source <admin-secret-key> --network <network>
   ```

4. **Upgrade the contract**
   Invoke the `upgrade` function on the existing deployed contract, passing the `wasm_hash` obtained in the previous step.
   ```bash
   stellar contract invoke --id <contract_id> --source <admin-secret-key> --network <network> -- upgrade --new_wasm_hash <wasm_hash>
   ```

5. **Migrate state and bump version**
   Invoke the `migrate` function to update the internal `ContractVersion` data key and execute any state transitions if the layout changed between versions.
   ```bash
   stellar contract invoke --id <contract_id> --source <admin-secret-key> --network <network> -- migrate --new_version 2
   ```

## Checking the Version
To verify the current version of the contract, invoke the `version` function:
```bash
stellar contract invoke --id <contract_id> --source <admin-secret-key> --network <network> -- version
```
