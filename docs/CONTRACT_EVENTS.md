# Contract Event Schema Reference

This document provides a comprehensive machine-readable reference of all events emitted by the XHedge Volatility Shield vault contract. Indexers, analytics platforms, and the AI engine can use this schema to parse and analyze contract events.

## Versioning

Events are versioned by contract version. The following table tracks which events were added in each version:

| Contract Version | Events Added |
|-----------------|--------------|
| v1.0 | Deposit, Withdraw, Rebalance, StrategyFlagged, StrategyRemoved, WithdrawQueued, WithdrawProcessed, WithdrawCancelled, ProposalCreated, ProposalApproved, ProposalExecuted, TimelockStarted, OracleDataUpdated, VaultPaused, EmergencyShutdownActivated, Harvest, StrategyAdded, GuardAdd, GuardRm, Threshold, GovToken, TlockExec, HarvestScheduled, StrategyF, StrategyR, paused, CapsSet, Staleness, upgrade, TimelockD, OracleStale, SlippageExceeded, VaultSnapshot, OracleCircuitBreakerActivated, OracleCircuitBreakerReset, UserBlocked, UserAllowlisted |

## Event Schema Table

| Event | Topics | Payload Fields | Emitting Function |
|-------|--------|----------------|-------------------|
| `ProposalCreated` | `ProposalCreated` | `id` | `propose_action()` |
| `TimelockStarted` | `TimelockStarted` | `(id, proposed_at)` | `propose_action()` |
| `ProposalApproved` | `ProposalApproved`, `proposal_id` | `guardian` | `approve_action()` |
| `ProposalExecuted` | `ProposalExecuted` | `()` | `execute_action()` |
| `TimelockExecuted` | `TimelockExecuted` | `()` | `execute_action()` |
| `Deposit` | `Deposit`, `user` | `(asset, amount, share_price, total_assets_value, total_shares)` | `deposit()` |
| `Withdraw` | `Withdraw`, `user` | `(asset, shares, share_price, total_assets_value, total_shares)` | `withdraw()` |
| `WithdrawQueued` | `WithdrawQueued`, `user` | `(asset, shares, share_price, total_assets_value, total_shares)` | `queue_withdraw()` |
| `WithdrawProcessed` | `WithdrawP`, `user` | `shares` | `process_queued_withdrawals()` |
| `WithdrawCancelled` | `WdrwCncl` | `(user, shares)` | `cancel_queued_withdrawal()` |
| `VaultSnapshot` | `VaultSnapshot` | `(total_assets, total_shares, allocations)` | `internal_rebalance()` |
| `StrategyAdded` | `StrategyAdded` | `strategy` | `internal_add_strategy()` |
| `StrategyFlagged` | `StrategyF`, `strategy` | `timestamp` | `flag_strategy()` |
| `StrategyRemoved` | `StrategyR`, `strategy` | `final_balance` | `remove_strategy()` |
| `Harvest` | `Harvest` | `(yield, total_assets, total_shares)` | `harvest()` |
| `HarvestScheduled` | `HarvestScheduled` | `next_eligible` | `harvest()`, `set_harvest_interval()` |
| `GuardianAdded` | `GuardAdd`, `guardian` | `()` | `add_guardian()` |
| `GuardianRemoved` | `GuardRm`, `guardian` | `()` | `remove_guardian()` |
| `ThresholdChanged` | `Threshold` | `threshold` | `set_threshold()` |
| `CapsSet` | `CapsSet`, `type` | `(per_user, global)` or `per_tx` | `set_deposit_cap()`, `set_withdraw_cap()` |
| `UserBlocked` | `UserBlocked` | `user` | `add_to_blocklist()` |
| `UserAllowlisted` | `UserAllowlisted` | `user` | `add_to_allowlist()` |
| `SlippageExceeded` | `SlippageExceeded` | `(strategy, expected, actual, slippage_bps)` | `internal_rebalance()` |
| `AssetAdd` | `AssetAdd` | `asset` | `add_supported_asset()` |
| `BatchDep` | `BatchDep`, `Fail` | `(from, asset, amount, reason)` | `batch_deposit()` |
| `BatchWd` | `BatchWd`, `Fail` | `(from, shares, reason)` | `batch_withdraw()` |
| `MaxFail` | `MaxFail` | `threshold` | `set_max_consecutive_failures()` |
| `OracleCircuitBreakerActivated` | `OracleCircuitBreakerActivated` | `timestamp` | `activate_oracle_circuit_breaker()` |
| `OracleCircuitBreakerReset` | `OracleCircuitBreakerReset` | `timestamp` | `reset_oracle_circuit_breaker()` |
| `GovToken` | `GovToken` | `token` | `set_governance_token()` |

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
