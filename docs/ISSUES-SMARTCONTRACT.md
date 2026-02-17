# Smart Contract Issues - XHedge 🛡️

This document tracks the detailed development tasks for the Soroban smart contracts.

---

## 🏛️ Core Vault Architecture

### Issue #SC-1: Vault State & Config
**Priority:** Critical
**Status:** ❌ PENDING
**Description:** Initialize the vault contract structure and define storage for assets and shares.
- **Tasks:**
  - [ ] Initialize `volatility_shield` project.
  - [ ] Define `DataKey` enum: `TotalAssets`, `TotalShares`, `Admin`, `Strategies`.
  - [ ] Implement `init(env, asset: Address, admin: Address)` function.
  - [ ] Store the underlying asset address (e.g., USDC).

### Issue #SC-2: Share Logic (ERC-4626 Style)
**Priority:** Critical
**Status:** ❌ PENDING
**Description:** Implement the math for minting/burning shares based on vault value.
- **Tasks:**
  - [ ] Implement `convert_to_shares(assets: i128) -> i128`.
    - Logic: `assets * total_shares / total_assets`.
  - [ ] Implement `convert_to_assets(shares: i128) -> i128`.
  - [ ] Ensure math handles division by zero (initial deposit).

### Issue #SC-3: Deposit & Withdraw
**Priority:** Critical
**Status:** ❌ PENDING
**Description:** The primary user entry points.
- **Tasks:**
  - [ ] Implement `deposit(env, from: Address, amount: i128)`.
    - Transfer asset from user to contract.
    - Mint shares to user.
  - [ ] Implement `withdraw(env, from: Address, shares: i128)`.
    - Burn shares.
    - Transfer assets to user.
  - [ ] Emit `Deposit` and `Withdraw` events.

---

## ⚙️ Strategy Management

### Issue #SC-4: Strategy Interface (Trait)
**Priority:** High
**Status:** ❌ PENDING
**Description:** Define the standard trait that all strategy adapters must implement.
- **Tasks:**
  - [ ] Define `StrategyTrait`:
    - `deposit(amount: i128)`
    - `withdraw(amount: i128)`
    - `balance() -> i128`
    - `harvest()`

### Issue #SC-5: Rebalancing Logic
**Priority:** High
**Status:** ❌ PENDING
**Description:** Allow the AI Oracle/Admin to move funds between strategies.
- **Tasks:**
  - [ ] Implement `add_strategy(address: Address)`.
  - [ ] Implement `rebalance(env, allocations: Map<Address, i128>)`.
  - [ ] Restrict `rebalance` to Admin/Oracle only.
  - [ ] Iterate through strategies to withdraw/deposit based on new allocation.

---

## 🧪 Testing

### Issue #SC-6: Vault Unit Tests
**Priority:** High
**Status:** ❌ PENDING
**Description:** Verify vault math and access control.
- **Tasks:**
  - [ ] Test initialization.
  - [ ] Test deposit/withdraw exchange rate (ensure no precision loss).
  - [ ] Test unauthorized rebalance (should fail).
  - [ ] Mock a strategy contract for integration testing.
