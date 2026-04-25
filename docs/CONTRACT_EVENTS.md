# Contract Event Schema Reference

This document provides a comprehensive machine-readable reference of all events emitted by the XHedge Volatility Shield vault contract. Indexers, analytics platforms, and the AI engine can use this schema to parse and analyze contract events.

## Versioning

Events are versioned by contract version. The following table tracks which events were added in each version:

| Contract Version | Events Added |
|-----------------|--------------|
| v1.0 | Deposit, Withdraw, Rebalance, StrategyFlagged, StrategyRemoved, WithdrawQueued, WithdrawProcessed, WithdrawCancelled, ProposalCreated, ProposalApproved, ProposalExecuted, TimelockStarted, OracleDataUpdated, VaultPaused, EmergencyShutdownActivated, Harvest, StrategyAdded, GuardAdd, GuardRm, Threshold, GovToken, TlockExec, HarvestScheduled, StrategyF, StrategyR, paused, CapsSet, Staleness, upgrade, TimelockD, OracleStale, SlippageExceeded, VaultSnapshot, OracleCircuitBreakerActivated, OracleCircuitBreakerReset, UserBlocked, UserAllowlisted |

## Event Schema Table

| Event Topic | Emitting Function | Payload Fields | Types | Example XDR |
|-------------|-------------------|----------------|-------|-------------|
| `Deposit` | `deposit()` | `from`, `asset`, `amount`, `share_price`, `total_assets`, `total_shares` | `Address`, `Address`, `i128`, `i128`, `i128`, `i128` | `(Address, (Address, i128, i128, i128, i128))` |
| `Withdraw` | `withdraw()` | `from`, `shares`, `share_price`, `total_assets`, `total_shares` | `Address`, `i128`, `i128`, `i128`, `i128` | `(Address, (i128, i128, i128, i128))` |
| `Rebalance` | `internal_rebalance()` | (emitted via VaultSnapshot) | - | - |
| `VaultSnapshot` | `internal_rebalance()` | `total_assets`, `total_shares`, `allocations` | `i128`, `i128`, `Map<Address, i128>` | `((), (i128, i128, Map<Address, i128>))` |
| `StrategyFlagged` | `flag_strategy()` | `strategy`, `timestamp` | `Address`, `u64` | `(Address, u64)` |
| `StrategyRemoved` | `remove_strategy()` | `strategy`, `balance` | `Address`, `i128` | `(Address, i128)` |
| `StrategyAdded` | `internal_add_strategy()` | `strategy` | `Address` | `((), Address)` |
| `WithdrawQueued` | `queue_withdraw()`, `internal_queue_withdraw()` | `from`, `shares`, `share_price`, `total_assets`, `total_shares` | `Address`, `i128`, `i128`, `i128`, `i128` | `(Address, (i128, i128, i128, i128))` |
| `WithdrawProcessed` | `process_queued_withdrawals()` | `user`, `shares` | `Address`, `i128` | `(Address, i128)` |
| `WithdrawCancelled` | `cancel_queued_withdrawal()` | `from`, `shares` | `Address`, `i128` | `((), (Address, i128))` |
| `ProposalCreated` | `propose_action()` | (emitted via TimelockStarted) | - | - |
| `TimelockStarted` | `propose_action()` | `proposal_id`, `proposed_at` | `u64`, `u64` | `((), (u64, u64))` |
| `ProposalApproved` | `approve_action()` | (no direct event) | - | - |
| `ProposalExecuted` | `execute_action()` | (emitted via TlockExec) | - | - |
| `TlockExec` | `execute_action()` | (empty) | `()` | `((), ())` |
| `OracleDataUpdated` | `set_oracle_data()` | (no direct event, uses OracleLastUpdate storage) | - | - |
| `OracleStale` | `internal_rebalance()` | `last_update` | `u64` | `((), u64)` |
| `VaultPaused` | `set_paused()` | `state` | `bool` | `(Symbol, bool)` |
| `paused` | `set_paused()` | `state` | `bool` | `(Symbol, bool)` |
| `EmergencyShutdownActivated` | (not directly implemented) | - | - | - |
| `Harvest` | `harvest()` | `total_yield`, `total_assets_after`, `total_shares_after` | `i128`, `i128`, `i128` | `((), (i128, i128, i128))` |
| `HarvestScheduled` | `harvest()`, `set_harvest_interval()` | `next_eligible_ledger` | `u32` | `(Symbol, u32)` |
| `GuardAdd` | `add_guardian()` | `guardian` | `Address` | `(Symbol, Address)` |
| `GuardRm` | `remove_guardian()` | `guardian` | `Address` | `(Symbol, Address)` |
| `Threshold` | `set_threshold()` | `threshold` | `u32` | `(Symbol, u32)` |
| `GovToken` | `set_governance_token()` | `token` | `Address` | `(Symbol, Address)` |
| `CapsSet` | `set_deposit_cap()`, `set_withdraw_cap()` | `cap_type`, `value` | `Symbol`, `i128` | `(Symbol, Symbol, i128)` |
| `Staleness` | `set_max_staleness()` | `seconds` | `u64` | `(Symbol, u64)` |
| `upgrade` | `upgrade()`, `migrate()` | `upgrade_type`, `data` | `Symbol`, `BytesN<32>` or `u32` | `(Symbol, Symbol, BytesN<32>)` or `(Symbol, Symbol, u32)` |
| `TimelockD` | `set_timelock_duration()` | `duration` | `u64` | `(Symbol, u64)` |
| `SlippageExceeded` | `internal_rebalance()` | `strategy`, `expected_balance`, `final_balance`, `slippage_bps` | `Address`, `i128`, `i128`, `i128` | `(Symbol, (Address, i128, i128, i128))` |
| `OracleCircuitBreakerActivated` | `activate_oracle_circuit_breaker()` | `timestamp` | `u64` | `(Symbol, u64)` |
| `OracleCircuitBreakerReset` | `reset_oracle_circuit_breaker()` | `timestamp` | `u64` | `(Symbol, u64)` |
| `UserBlocked` | `check_compliance()`, `add_to_blocklist()` | `user` | `Address` | `(Symbol, Address)` |
| `UserAllowlisted` | `add_to_allowlist()` | `user` | `Address` | `(Symbol, Address)` |
| `BatchDep` | `batch_deposit()` (failure events) | `status`, `from`, `asset`, `amount`, `reason` | `Symbol`, `Address`, `Address`, `i128`, `Symbol` | `(Symbol, Symbol, (Address, Address, i128, Symbol))` |
| `BatchWd` | `batch_withdraw()` (failure events) | `status`, `from`, `shares`, `reason` | `Symbol`, `Address`, `i128`, `Symbol` | `(Symbol, Symbol, (Address, i128, Symbol))` |
| `DepositCapExceeded` | `deposit()`, `batch_deposit()` | `amount` | `i128` | `(Symbol, i128)` |
| `WithdrawCapExceeded` | `withdraw()`, `batch_withdraw()` | `amount` | `i128` | `(Symbol, i128)` |
| `QueueThr` | `set_withdraw_queue_threshold()` | `threshold` | `i128` | `(Symbol, i128)` |
| `WithdrawP` | `process_queued_withdrawals()` | `user`, `shares` | `Address`, `i128` | `(Symbol, Address), i128` |
| `WdrwCncl` | `cancel_queued_withdrawal()` | `from`, `shares` | `Address`, `i128` | `(Symbol, (Address, i128))` |
| `StrategyF` | `flag_strategy()` | `strategy`, `timestamp` | `Address`, `u64` | `(Symbol, Address), u64` |
| `StrategyR` | `remove_strategy()` | `strategy`, `balance` | `Address`, `i128` | `(Symbol, Address), i128` |

## Event Topic Symbols

The following symbol strings are used as event topics in the contract:

- `Deposit` - User deposit completed
- `Withdraw` - User withdrawal completed
- `VaultSnapshot` - Rebalance operation completed with vault state
- `StrategyFlagged` / `StrategyF` - Strategy marked as unhealthy
- `StrategyRemoved` / `StrategyR` - Strategy removed from vault
- `StrategyAdded` - New strategy added to vault
- `WithdrawQueued` - Large withdrawal queued for processing
- `WithdrawProcessed` / `WithdrawP` - Queued withdrawal processed
- `WithdrawCancelled` / `WdrwCncl` - Queued withdrawal cancelled
- `TimelockStarted` - Governance proposal created
- `TlockExec` - Governance proposal executed
- `OracleStale` - Oracle data too old for rebalance
- `VaultPaused` / `paused` - Vault paused/unpaused
- `Harvest` - Yield harvested from strategies
- `HarvestScheduled` - Next harvest eligibility scheduled
- `GuardAdd` - Guardian added to multisig
- `GuardRm` - Guardian removed from multisig
- `Threshold` - Approval threshold changed
- `GovToken` - Governance token address set
- `CapsSet` - Deposit/withdraw caps set
- `Staleness` - Max oracle staleness set
- `upgrade` - Contract upgrade/migration
- `TimelockD` - Timelock duration set
- `SlippageExceeded` - Rebalance slippage exceeded threshold
- `OracleCircuitBreakerActivated` - Circuit breaker activated
- `OracleCircuitBreakerReset` - Circuit breaker reset
- `UserBlocked` - User blocked from depositing
- `UserAllowlisted` - User added to allowlist
- `BatchDep` - Batch deposit operation status
- `BatchWd` - Batch withdraw operation status
- `DepositCapExceeded` - Deposit cap exceeded
- `WithdrawCapExceeded` - Withdrawal cap exceeded
- `QueueThr` - Withdrawal queue threshold set

## Usage Examples

### Parsing Events with Soroban SDK

```rust
use soroban_sdk::{Env, Event};

fn parse_deposit_event(env: &Env, event: &Event) {
    // Access event topics and data
    let topics = event.topics;
    let data = event.data;
    
    // Deposit event has: (Symbol("Deposit"), Address)
    // Data: (Address, i128, i128, i128, i128, i128)
}
```

### Indexer Integration

Indexers should:
1. Subscribe to contract events using the Stellar RPC API
2. Parse event topics to identify event type
3. Decode payload data according to the schema above
4. Store indexed data for analytics and AI engine consumption

## Notes

- All monetary values are in the smallest unit of the asset (e.g., stroops for XLM)
- Basis points (bps) are used for percentages: 1 bps = 0.01%
- Timestamps are Unix timestamps in seconds
- Ledger numbers are sequence numbers from the Stellar ledger
- Some events have both long-form and short-form topic symbols (e.g., `StrategyFlagged` and `StrategyF`)
- Events are emitted in the order they occur within a transaction
