# XHedge Upgrade & Wind-Down Guide

This document covers operational procedures that take the
`volatility_shield` vault out of normal service: contract upgrades, regulatory
shut-downs, and protocol sunsets. The current revision focuses on the
**orderly wind-down** procedure introduced by SC-40.

---

## When to wind the vault down

Initiate a wind-down whenever the vault must permanently or indefinitely
stop accepting deposits and let every depositor exit cleanly. Typical
triggers are:

- **Protocol sunset.** The vault is being deprecated in favour of a new
  contract or a different product.
- **Contract upgrade.** A non-trivial migration where the safer path is to
  drain the existing vault and redeploy, rather than do an in-place upgrade.
- **Regulatory action.** Counsel or a regulator requires the protocol to
  stop offering the product to existing users in an orderly fashion.
- **Severe, unrecoverable bug.** A bug class where `emergency_shutdown` plus
  user-initiated `emergency_withdraw` is appropriate as a *first* response
  but the vault should not resume — once the panic is over, the wind-down
  procedure is the supervised exit.

Wind-down is **not** a substitute for `emergency_shutdown`. Use
`emergency_shutdown` when funds may be at immediate risk and individual
users need to pull out unilaterally; use the wind-down procedure when the
vault should be drained in an orderly, queued, audit-friendly way.

---

## What the wind-down does

The wind-down procedure is a single guardian-approved governance action
(`ActionType::InitiateWindDown`). Once the multisig threshold is reached
and `execute_action` runs, the contract performs the following steps
atomically inside one transaction:

1. **Sets the `WindDownActive` flag.** From this point on, every call to
   `deposit` and `batch_deposit_for` is rejected with
   `Error::WindDownActive` (error code `34`, symbol `wind_down_active`).
2. **Best-effort `harvest()`.** Any uncollected yield is realised and
   credited to the vault before users are paid out. A failed harvest (no
   strategies, harvest interval not yet elapsed, or any strategy reporting
   an error) is logged but does **not** abort the wind-down — exits must
   not be blocked by yield issues.
3. **Drains the entire withdrawal queue.** The contract calls
   `process_queued_withdrawals(u32::MAX)` so every pending
   `QueuedWithdrawal` is paid out in FIFO order. There is no per-call
   limit; the only ceiling is the transaction's resource budget.
4. **Emits `WindDownInitiated`.** The event payload records the
   initiator, ledger timestamp, number of queued withdrawals processed,
   and the resulting `total_assets` / `total_shares`.

After the action returns, the vault is in a "draining" steady state:

- New deposits are blocked.
- Users with no queued withdrawal can still call `withdraw` (or
  `queue_withdraw` if their amount is over the queue threshold). Those
  later requests can be settled by another `process_queued_withdrawals`
  call from the admin, or by users through `emergency_withdraw` if
  `emergency_shutdown` is also active.
- `is_wind_down_active()` returns `true` for off-chain monitoring.

The wind-down flag is intentionally **one-way**. There is no
`cancel_wind_down` entry point; recovering from an erroneously-initiated
wind-down requires a contract upgrade.

---

## Step-by-step procedure

### 1. Pre-flight checks (off-chain)

- Confirm the decision in writing with the admin / multisig signers and,
  if relevant, counsel.
- Snapshot the share-price history and per-user balances for accounting
  and tax records (`get_share_price_history`, `get_user_summary`).
- Communicate the wind-down date to users via the usual channels and give
  them time to queue their withdrawals if their amount exceeds
  `withdraw_queue_threshold`.

### 2. Propose the wind-down

A guardian proposes the action:

```rust
client.propose_action(&guardian_a, &ActionType::InitiateWindDown);
```

`propose_action` requires the proposer's authorisation and that they are
in the guardian set. The proposal is recorded in `Proposals` and a
`ProposalCreated` event is emitted.

### 3. Approve until threshold is reached

Each remaining guardian signs `approve_action`:

```rust
client.approve_action(&guardian_b, &proposal_id);
client.approve_action(&guardian_c, &proposal_id);
// …
```

Once `proposal.approvals.len() >= threshold` and the configured timelock
(if any) has elapsed, the contract calls `execute_action`, which routes
`InitiateWindDown` to `internal_initiate_wind_down`. The wind-down runs
in the same transaction as the final approval.

If `threshold == 1`, the proposal executes immediately on
`propose_action` (this is the path exercised by the SC-40 end-to-end
test).

### 4. Verify

After the proposal is executed, off-chain operators should verify:

- `is_wind_down_active()` returns `true`.
- `get_pending_withdrawals().len() == 0` *for queue entries that existed
  before the wind-down*.
- The aggregate token balance paid out matches the pre-wind-down
  `total_assets`.
- A `WindDownInitiated` event is present in the contract event log with
  the expected `queued_processed` count.

### 5. Settle stragglers

Users who didn't have a queued withdrawal at wind-down time can still
exit:

- Small amounts (below `withdraw_queue_threshold`) settle immediately
  through `withdraw`.
- Larger amounts are queued; the admin runs
  `process_queued_withdrawals(u32::MAX)` periodically until the queue is
  empty.
- If the admin is unreachable, governance can also activate
  `emergency_shutdown`, which lets each user pull their full balance
  with `emergency_withdraw`.

### 6. Final accounting

When the queue is empty and no user has a non-zero `Balance`,
`total_assets` and `total_shares` should both be `0` (the SC-40 test
asserts this for the queued-withdrawal scenario). Any residual token
balance held by the contract address represents either dust from
rounding or yield that arrived after harvest; it can be swept to the
treasury via the existing fee path.

---

## Off-chain integration notes

- **Frontend.** When `is_wind_down_active()` returns true, the deposit UI
  must be disabled and a wind-down banner shown. The error returned by a
  rejected deposit will be `wind_down_active` (string symbol) — surface
  it as a clear "deposits are closed; the vault is winding down" message
  rather than a generic failure.
- **Indexers.** Subscribe to the `WindDownInitiated` topic to detect the
  state transition. The payload carries the initiating address, ledger
  timestamp, and post-execution totals so dashboards can switch into
  wind-down view without a follow-up RPC.

---

## Error reference

| Error                       | Code | Symbol               | Meaning                                                                 |
|-----------------------------|------|----------------------|-------------------------------------------------------------------------|
| `Error::WindDownActive`     | 34   | `wind_down_active`   | Operation rejected because the vault is in wind-down mode (SC-40).      |
| `Error::EmergencyShutdownActive` | 26 | `emergency_shutdown_active` | Operation rejected because emergency shutdown is active.            |
| `Error::ContractPaused`     | 6    | `contract_paused`    | Operation rejected because the vault is paused.                         |

Compare with `is_paused`, `is_emergency_shutdown`, and
`is_wind_down_active` to disambiguate the three "vault not accepting
input" states from the off-chain side.
