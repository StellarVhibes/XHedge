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


============

# 🆕 NEW ISSUES


### Issue #SC-19a: Multi-Signature Admin — Guardian Registry
**Priority:** Critical
**Labels:** `smart-contract`, `security`, `governance`
**Description:** Set up the guardian storage and management functions for multi-sig control.
- **Tasks:**
  - [ ] Add `DataKey::Guardians` (Vec\<Address\>) and `DataKey::Threshold` to storage.
  - [ ] Implement `add_guardian(env, guardian: Address)` (admin-only).
  - [ ] Implement `remove_guardian(env, guardian: Address)` (admin-only).
  - [ ] Implement `set_threshold(env, threshold: u32)` for approval count.
  - [ ] Write unit tests for guardian CRUD operations.

### Issue #SC-19b: Multi-Signature Admin — Proposal & Approval Flow
**Priority:** Critical
**Labels:** `smart-contract`, `security`, `governance`
**Description:** Build the proposal/approval mechanism and migrate sensitive functions to use it.
- **Tasks:**
  - [ ] Create `propose_action(env, action_type, params)` that stores pending proposals.
  - [ ] Create `approve_action(env, proposal_id)` that requires `threshold` guardian signatures.
  - [ ] Migrate `set_paused`, `add_strategy`, and `rebalance` to require multi-sig approval.
  - [ ] Write integration tests for quorum scenarios (partial approval, full approval, rejection).

### Issue #SC-20: Timelock on Critical Operations
**Priority:** High
**Labels:** `smart-contract`, `security`
**Description:** Enforce a configurable delay between proposal and execution for high-impact admin actions (e.g., strategy changes, fee updates). This gives users time to exit if they disagree.
- **Tasks:**
  - [ ] Add `DataKey::TimelockDuration` to storage.
  - [ ] Implement `set_timelock_duration(env, duration: u64)`.
  - [ ] Store proposal timestamp on `propose_action`.
  - [ ] Add `assert_timelock_elapsed` check to `execute_action`.
  - [ ] Emit `TimelockStarted` and `TimelockExecuted` events.
  - [ ] Write tests for premature execution rejection.

### Issue #SC-21: Deposit & Withdrawal Caps
**Priority:** High
**Labels:** `smart-contract`, `risk-management`
**Description:** Implement per-user and global caps to limit exposure and prevent whale manipulation.
- **Tasks:**
  - [ ] Add `DataKey::MaxDepositPerUser` and `DataKey::MaxTotalAssets` to storage.
  - [ ] Implement `set_deposit_cap(env, per_user: i128, global: i128)`.
  - [ ] Add cap validation in `deposit()` function.
  - [ ] Add `DataKey::MaxWithdrawPerTx` for single-transaction withdrawal limits.
  - [ ] Emit `CapBreached` event when a deposit is rejected.
  - [ ] Write unit tests for cap enforcement edge cases.

### Issue #SC-22: Slippage Protection on Rebalance
**Priority:** High
**Labels:** `smart-contract`, `risk-management`
**Description:** Prevent rebalancing from executing if market conditions have shifted significantly since the allocation was calculated.
- **Tasks:**
  - [ ] Add `max_slippage_bps: u32` parameter to `rebalance()`.
  - [ ] After strategy deposit/withdraw, verify actual balance vs. expected within tolerance.
  - [ ] Revert the entire rebalance if any strategy deviates beyond `max_slippage_bps`.
  - [ ] Emit `SlippageExceeded` event on revert.
  - [ ] Write tests with a mock strategy that simulates price drift.

---

## ⚙️ Module R-SC: Operational Resilience (Issues SC-23 to SC-26)

### Issue #SC-23: Contract Upgrade Pattern (Proxy)
**Priority:** Critical
**Labels:** `smart-contract`, `architecture`
**Description:** Implement an upgrade mechanism so the vault logic can be patched without migrating user funds.
- **Tasks:**
  - [ ] Design a versioned storage schema (e.g., `DataKey::Version`).
  - [ ] Implement `migrate(env, new_version: u32)` function.
  - [ ] Add version check on all public entry points.
  - [ ] Write migration tests that simulate upgrading from v1 to v2.
  - [ ] Document the upgrade procedure in `docs/UPGRADE_GUIDE.md`.

### Issue #SC-24a: Oracle Data Validation — Freshness & Staleness
**Priority:** High
**Labels:** `smart-contract`, `security`, `oracle`
**Description:** Ensure the rebalance oracle's signals are fresh before executing fund movements.
- **Tasks:**
  - [ ] Add `DataKey::OracleLastUpdate` timestamp to storage.
  - [ ] Implement `set_oracle_data(env, data, timestamp)` with freshness validation.
  - [ ] Reject rebalance if oracle data is older than `MAX_STALENESS` (configurable).
  - [ ] Emit `StaleOracleRejected` event.

### Issue #SC-24b: Oracle Data Validation — Allocation Sanity Checks
**Priority:** High
**Labels:** `smart-contract`, `security`, `oracle`
**Description:** Validate the oracle's allocation data for logical correctness before rebalancing.
- **Tasks:**
  - [ ] Validate allocation percentages sum to 100% in `rebalance()`.
  - [ ] Validate individual allocation values are non-negative.
  - [ ] Reject allocations with zero-address strategies.
  - [ ] Write tests for malformed allocation scenarios.

### Issue #SC-25a: Withdrawal Queue — Core Queue Mechanism
**Priority:** Medium
**Labels:** `smart-contract`, `feature`, `risk-management`
**Description:** Implement the queuing mechanism for large withdrawals that could destabilize strategy allocations.
- **Tasks:**
  - [ ] Add `DataKey::WithdrawQueueThreshold` and `DataKey::PendingWithdrawals` to storage.
  - [ ] Implement `queue_withdraw(env, from, shares)` for above-threshold amounts.
  - [ ] Emit `WithdrawQueued` event.
  - [ ] Write unit tests for threshold enforcement.

### Issue #SC-25b: Withdrawal Queue — Processing & Cancellation
**Priority:** Medium
**Labels:** `smart-contract`, `feature`, `risk-management`
**Description:** Allow admins to process queued withdrawals and users to cancel their pending requests.
- **Tasks:**
  - [ ] Implement `process_withdraw_queue(env)` (admin/keeper callable).
  - [ ] Allow users to cancel queued withdrawals via `cancel_withdraw(env, from)`.
  - [ ] Emit `WithdrawProcessed` and `WithdrawCancelled` events.
  - [ ] Write end-to-end tests for the full queue lifecycle.

### Issue #SC-26: Strategy Health Monitoring
**Priority:** Medium
**Labels:** `smart-contract`, `monitoring`
**Description:** Track strategy performance and automatically flag or remove underperforming/unresponsive strategies.
- **Tasks:**
  - [ ] Add `DataKey::StrategyHealth(Address)` storing last-known balance and timestamp.
  - [ ] Implement `check_strategy_health(env)` that compares expected vs. actual balances.
  - [ ] Implement `flag_strategy(env, strategy)` to mark unhealthy strategies.
  - [ ] Implement `remove_strategy(env, strategy)` that withdraws all funds first.
  - [ ] Emit `StrategyFlagged` and `StrategyRemoved` events.
  - [ ] Write tests for strategy failure scenarios.
