# Smart Contract Issues - XHedge 🛡️

This document tracks the detailed development tasks for the Soroban smart contracts.

---

## 🏛️ Module 1: Vault Core Infrastructure (Issues SC-1 to SC-8)

### Issue #SC-1: Contract Setup & Error Constants [COMPLETED]

**Priority:** Critical
**Labels:** `smart-contract`, `good-first-issue`
**Description:** Initialize the Soroban project and define standard error codes.

- **Tasks:**
  - [x] Initialize `volatility_shield` project structure.
  - [x] Define `Error` enum: `NotInitialized`, `AlreadyInitialized`, `NegativeAmount`.
  - [x] Configure `Cargo.toml` with `soroban-sdk` dependencies.

### Issue #SC-2: Storage Key Definitions [COMPLETED]

**Priority:** Critical
**Labels:** `smart-contract`, `config`
**Description:** Define the storage keys used for contract state persistence.

- **Tasks:**
  - [x] Define `DataKey` enum: `TotalAssets`, `TotalShares`, `Admin`.
  - [x] Implement `has_admin` helper function.
  - [x] Implement `read_admin` helper function.

### Issue #SC-3: Vault Initialization Logic [COMPLETED]

**Priority:** High
**Labels:** `smart-contract`, `core`
**Description:** Implement the constructor-like init function.

- **Tasks:**
  - [x] Implement `init(env, asset: Address, admin: Address)`.
  - [x] Assert not already initialized.
  - [x] Store asset principal and initial state.

### Issue #SC-4: Share Calculation Math (Mint) [COMPLETED]

**Priority:** Critical
**Labels:** `smart-contract`, `math`
**Description:** Implement ERC-4626 style conversion for deposits.

- **Tasks:**
  - [x] Implement `convert_to_shares(amount: i128) -> i128`.
  - [x] Handle division by zero (initial deposit case).
  - [x] Write unit test for precision loss.

### Issue #SC-5: Share Calculation Math (Burn) [COMPLETED]

**Priority:** Critical
**Labels:** `smart-contract`, `math`
**Description:** Implement ERC-4626 style conversion for withdrawals.

- **Tasks:**
  - [x] Implement `convert_to_assets(shares: i128) -> i128`.
  - [x] Ensure rounding favors the vault (security best practice).

### Issue #SC-6: Deposit Function Implementation [COMPLETED]

**Priority:** Critical
**Labels:** `smart-contract`, `feature`
**Description:** The primary entry point for users to fund the vault.

- **Tasks:**
  - [x] Implement `deposit(env, from: Address, amount: i128)`.
  - [x] Transfer token from user to contract.
  - [x] Mint shares to user balance.
  - [x] Emit `Deposit` event.

### Issue #SC-7: Withdraw Function Implementation [COMPLETED]

**Priority:** Critical
**Labels:** `smart-contract`, `feature`
**Description:** The primary exit point for users.

- **Tasks:**
  - [x] Implement `withdraw(env, from: Address, shares: i128)`.
  - [x] Burn shares from user balance.
  - [x] Transfer underlying token to user.
  - [x] Emit `Withdraw` event.

### Issue #SC-8: Emergency Pause Mechanism [COMPLETED]

**Priority:** Medium
**Labels:** `smart-contract`, `security`
**Description:** A circuit breaker for the admin to stop deposits/withdrawals.

- **Tasks:**
  - [x] Add `Paused` state to `DataKey`.
  - [x] Implement `set_paused(env, state: bool)`.
  - [x] Add `assert_not_paused` check to deposit/withdraw.

---

## ⚙️ Module 2: Strategy Management (Issues SC-9 to SC-15)

### Issue #SC-9: Strategy Trait Definition [COMPLETED]

**Priority:** High
**Labels:** `smart-contract`, `architecture`
**Description:** Define the interface for external strategy contracts.

- **Tasks:**
  - [x] Define `StrategyTrait` with `deposit`, `withdraw`, `balance`.

### Issue #SC-10: Strategy Registry Storage [COMPLETED]

**Priority:** Medium
**Labels:** `smart-contract`, `storage`
**Description:** Store the list of active strategies.

- **Tasks:**
  - [x] Define `Strategies` storage key (Vec<Address>).
  - [x] Implement `add_strategy` function (Admin only).

### Issue #SC-11: Rebalance Logic (Calculation) [COMPLETED]

**Priority:** High
**Labels:** `smart-contract`, `logic`
**Description:** Logic to determine how much to move.

- **Tasks:**
  - [x] Implement `calc_rebalance_delta(current, target)`.

### Issue #SC-12: Rebalance Execution [COMPLETED]

**Priority:** High
**Labels:** `smart-contract`, `feature`
**Description:** Execute the movement of funds between strategies.

- **Tasks:**
  - [x] Implement `rebalance(env, allocations)`.
  - [x] Restrict to Admin/Oracle.

### Issue #SC-13: Harvest Yield Function [COMPLETED]

**Priority:** Medium
**Labels:** `smart-contract`, `yield`
**Description:** Collect rewards from strategies.

- **Tasks:**
  - [x] Implement `harvest(env)`.
  - [x] Distribute yield to vault (increasing share price).

### Issue #SC-14: Access Control Modifiers [COMPLETED]

**Priority:** High
**Labels:** `smart-contract`, `security`
**Description:** Ensure only admin can call sensitive functions.

- **Tasks:**
  - [x] Implement `require_admin` check.
  - [x] Apply to all config functions.

### Issue #SC-15: Fee Management [COMPLETED]

**Priority:** Low
**Labels:** `smart-contract`, `economics`
**Description:** Implement performance/management fees.

- **Tasks:**
  - [x] Implement `take_fees` function.
  - [x] Send fee percentage to treasury.


# 🧪 Module 3: Testing & Verification (Issues SC-16 to SC-18)

### Issue #SC-16: Core Unit Tests [COMPLETED]
**Priority:** High
**Labels:** `testing`, `rust`
**Description:** Verify basic vault mechanics.
- **Tasks:**
  - [x] Test initialization.
  - [x] Test simple deposit/withdraw flow.

### Issue #SC-17: Integration Tests (Mock Strategy) [COMPLETED]
**Priority:** Medium
**Labels:** `testing`, `integration`
**Description:** Test interaction with external contracts.
- **Tasks:**
  - [x] Create `MockStrategy` contract.
  - [x] Test rebalancing into mock strategy.

### Issue #SC-18: Fuzz Testing [COMPLETED]
**Priority:** Low
**Labels:** `testing`, `security`
**Description:** Property-based testing for math safety.
- **Tasks:**
  - [x] Fuzz test share conversion for overflows.
