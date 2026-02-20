# Smart Contract Issues - XHedge 🛡️

This document tracks the detailed development tasks for the Soroban smart contracts.

---

## 🏛️ Module 1: Vault Core Infrastructure (Issues SC-1 to SC-8)

### Issue #SC-1: Contract Setup & Error Constants

**Priority:** Critical
**Labels:** `smart-contract`, `good-first-issue`
**Description:** Initialize the Soroban project and define standard error codes.

- **Tasks:**
  - [ ] Initialize `volatility_shield` project structure.
  - [ ] Define `Error` enum: `NotInitialized`, `AlreadyInitialized`, `NegativeAmount`.
  - [ ] Configure `Cargo.toml` with `soroban-sdk` dependencies.

### Issue #SC-2: Storage Key Definitions

**Priority:** Critical
**Labels:** `smart-contract`, `config`
**Description:** Define the storage keys used for contract state persistence.

- **Tasks:**
  - [ ] Define `DataKey` enum: `TotalAssets`, `TotalShares`, `Admin`.
  - [ ] Implement `has_admin` helper function.
  - [ ] Implement `read_admin` helper function.

### Issue #SC-3: Vault Initialization Logic

**Priority:** High
**Labels:** `smart-contract`, `core`
**Description:** Implement the constructor-like init function.

- **Tasks:**
  - [ ] Implement `init(env, asset: Address, admin: Address)`.
  - [ ] Assert not already initialized.
  - [ ] Store asset principal and initial state.

### Issue #SC-4: Share Calculation Math (Mint)

**Priority:** Critical
**Labels:** `smart-contract`, `math`
**Description:** Implement ERC-4626 style conversion for deposits.

- **Tasks:**
  - [ ] Implement `convert_to_shares(amount: i128) -> i128`.
  - [ ] Handle division by zero (initial deposit case).
  - [ ] Write unit test for precision loss.

### Issue #SC-5: Share Calculation Math (Burn)

**Priority:** Critical
**Labels:** `smart-contract`, `math`
**Description:** Implement ERC-4626 style conversion for withdrawals.

- **Tasks:**
  - [ ] Implement `convert_to_assets(shares: i128) -> i128`.
  - [ ] Ensure rounding favors the vault (security best practice).

### Issue #SC-6: Deposit Function Implementation

**Priority:** Critical
**Labels:** `smart-contract`, `feature`
**Description:** The primary entry point for users to fund the vault.

- **Tasks:**
  - [ ] Implement `deposit(env, from: Address, amount: i128)`.
  - [ ] Transfer token from user to contract.
  - [ ] Mint shares to user balance.
  - [ ] Emit `Deposit` event.

### Issue #SC-7: Withdraw Function Implementation

**Priority:** Critical
**Labels:** `smart-contract`, `feature`
**Description:** The primary exit point for users.

- **Tasks:**
  - [ ] Implement `withdraw(env, from: Address, shares: i128)`.
  - [ ] Burn shares from user balance.
  - [ ] Transfer underlying token to user.
  - [ ] Emit `Withdraw` event.

### Issue #SC-8: Emergency Pause Mechanism

**Priority:** Medium
**Labels:** `smart-contract`, `security`
**Description:** A circuit breaker for the admin to stop deposits/withdrawals.

- **Tasks:**
  - [ ] Add `Paused` state to `DataKey`.
  - [ ] Implement `set_paused(env, state: bool)`.
  - [ ] Add `assert_not_paused` check to deposit/withdraw.

---

## ⚙️ Module 2: Strategy Management (Issues SC-9 to SC-15)

### Issue #SC-9: Strategy Trait Definition

**Priority:** High
**Labels:** `smart-contract`, `architecture`
**Description:** Define the interface for external strategy contracts.

- **Tasks:**
  - [ ] Define `StrategyTrait` with `deposit`, `withdraw`, `balance`.

### Issue #SC-10: Strategy Registry Storage

**Priority:** Medium
**Labels:** `smart-contract`, `storage`
**Description:** Store the list of active strategies.

- **Tasks:**
  - [ ] Define `Strategies` storage key (Vec<Address>).
  - [ ] Implement `add_strategy` function (Admin only).

### Issue #SC-11: Rebalance Logic (Calculation)

**Priority:** High
**Labels:** `smart-contract`, `logic`
**Description:** Logic to determine how much to move.

- **Tasks:**
  - [ ] Implement `calc_rebalance_delta(current, target)`.

### Issue #SC-12: Rebalance Execution

**Priority:** High
**Labels:** `smart-contract`, `feature`
**Description:** Execute the movement of funds between strategies.

- **Tasks:**
  - [ ] Implement `rebalance(env, allocations)`.
  - [ ] Restrict to Admin/Oracle.

### Issue #SC-13: Harvest Yield Function

**Priority:** Medium
**Labels:** `smart-contract`, `yield`
**Description:** Collect rewards from strategies.

- **Tasks:**
  - [ ] Implement `harvest(env)`.
  - [ ] Distribute yield to vault (increasing share price).

### Issue #SC-14: Access Control Modifiers

**Priority:** High
**Labels:** `smart-contract`, `security`
**Description:** Ensure only admin can call sensitive functions.

- **Tasks:**
  - [ ] Implement `require_admin` check.
  - [ ] Apply to all config functions.

### Issue #SC-15: Fee Management

**Priority:** Low
**Labels:** `smart-contract`, `economics`
**Description:** Implement performance/management fees.

- **Tasks:**
  - [ ] Implement `take_fees` function.
  - [ ] Send fee percentage to treasury.
