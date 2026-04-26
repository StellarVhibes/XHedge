#!/bin/bash
REPO="StellarVhibes/XHedge"

create_issue() {
  local title=$1
  local body=$2
  local labels=$3
  gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels"
}

# Labels
gh label create stellar-wave --color "#0e8a16" --description "Tasks for the Stellar Wave initiative" --repo "$REPO" --force
gh label create "smart-contract" --color "#dea584" --description "Smart contract logic" --repo "$REPO" --force
gh label create "frontend" --color "#c5def5" --description "UI/UX and frontend logic" --repo "$REPO" --force
gh label create "risk-management" --color "#e11d21" --description "Risk mitigation and safety" --repo "$REPO" --force
gh label create "monitoring" --color "#006b75" --description "Observability and health checks" --repo "$REPO" --force
gh label create "governance" --color "#0052cc" --description "DAO and voting features" --repo "$REPO" --force
gh label create "ux" --color "#fef2c0" --description "User experience enhancements" --repo "$REPO" --force
gh label create "hook" --color "#d4c5f9" --description "React hooks or custom logic" --repo "$REPO" --force
gh label create "chart" --color "#bfd4f2" --description "Data visualization" --repo "$REPO" --force

# SC-23
create_issue "[SC-23] Contract Upgrade Pattern (Proxy)" "### 📝 Description
Implement an upgrade mechanism so the vault logic can be patched without migrating user funds.

### 🛠 Tech Stack
• Language: Rust (Soroban SDK)
• Role: Smart Contract Engineering

### 🔴 Severity: CRITICAL

### ✅ Acceptance Criteria
- Design a versioned storage schema (e.g., \`DataKey::Version\`).
- Implement \`migrate(env, new_version: u32)\` function.
- Add version check on all public entry points.
- Write migration tests that simulate upgrading from v1 to v2.
- Document the upgrade procedure in \`docs/UPGRADE_GUIDE.md\`.

---
### ⚠️ Must Do:
- [ ] **Verify Integrity**: Before submitting your PR, ensure all checks pass locally.
- [ ] **Correct Implementation**: Each issue must be solved accurately." "smart-contract,architecture,stellar-wave"

# SC-24a
create_issue "[SC-24a] Oracle Data Validation — Freshness & Staleness" "### 📝 Description
Ensure the rebalance oracle's signals are fresh before executing fund movements.

### 🛠 Tech Stack
• Language: Rust (Soroban SDK)
• Role: Smart Contract Engineering

### 🟠 Severity: HIGH

### ✅ Acceptance Criteria
- Add \`DataKey::OracleLastUpdate\` timestamp to storage.
- Implement \`set_oracle_data(env, data, timestamp)\` with freshness validation.
- Reject rebalance if oracle data is older than \`MAX_STALENESS\` (configurable).
- Emit \`StaleOracleRejected\` event." "smart-contract,security,oracle,stellar-wave"

# SC-24b
create_issue "[SC-24b] Oracle Data Validation — Allocation Sanity Checks" "### 📝 Description
Validate the oracle's allocation data for logical correctness before rebalancing.

### 🛠 Tech Stack
• Language: Rust (Soroban SDK)
• Role: Smart Contract Engineering

### 🟠 Severity: HIGH

### ✅ Acceptance Criteria
- Validate allocation percentages sum to 100% in \`rebalance()\`.
- Validate individual allocation values are non-negative.
- Reject allocations with zero-address strategies.
- Write tests for malformed allocation scenarios." "smart-contract,security,oracle,stellar-wave"

# SC-25a
create_issue "[SC-25a] Withdrawal Queue — Core Queue Mechanism" "### 📝 Description
Implement the queuing mechanism for large withdrawals that could destabilize strategy allocations.

### 🛠 Tech Stack
• Language: Rust (Soroban SDK)
• Role: Smart Contract Engineering

### 🟡 Severity: MEDIUM

### ✅ Acceptance Criteria
- Add \`DataKey::WithdrawQueueThreshold\` and \`DataKey::PendingWithdrawals\` to storage.
- Implement \`queue_withdraw(env, from, shares)\` for above-threshold amounts.
- Emit \`WithdrawQueued\` event.
- Write unit tests for threshold enforcement." "smart-contract,feature,risk-management,stellar-wave"

# SC-25b
create_issue "[SC-25b] Withdrawal Queue — Processing & Cancellation" "### 📝 Description
Allow admins to process queued withdrawals and users to cancel their pending requests.

### 🛠 Tech Stack
• Language: Rust (Soroban SDK)
• Role: Smart Contract Engineering

### 🟡 Severity: MEDIUM

### ✅ Acceptance Criteria
- Implement \`process_withdraw_queue(env)\` (admin/keeper callable).
- Allow users to cancel queued withdrawals via \`cancel_withdraw(env, from)\`.
- Emit \`WithdrawProcessed\` and \`WithdrawCancelled\` events.
- Write end-to-end tests for the full queue lifecycle." "smart-contract,feature,risk-management,stellar-wave"

# SC-26
create_issue "[SC-26] Strategy Health Monitoring" "### 📝 Description
Track strategy performance and automatically flag or remove underperforming/unresponsive strategies.

### 🛠 Tech Stack
• Language: Rust (Soroban SDK)
• Role: Smart Contract Engineering

### 🟡 Severity: MEDIUM

### ✅ Acceptance Criteria
- Add \`DataKey::StrategyHealth(Address)\` storing last-known balance and timestamp.
- Implement \`check_strategy_health(env)\` that compares expected vs. actual balances.
- Implement \`flag_strategy(env, strategy)\` to mark unhealthy strategies.
- Implement \`remove_strategy(env, strategy)\` that withdraws all funds first.
- Emit \`StrategyFlagged\` and \`StrategyRemoved\` events." "smart-contract,monitoring,stellar-wave"

# FE-23
create_issue "[FE-23] Onboarding Tour Component" "### 📝 Description
Guide new users through the dashboard using a structured tour component.

### 🛠 Tech Stack
• Framework: React / Next.js
• Role: UI/UX Engineering

### 🟡 Severity: MEDIUM

### ✅ Acceptance Criteria
- Integrate a tour library (e.g., \`react-joyride\`).
- Define steps for Treasury and Strategy sections.
- Ensure the tour only triggers for first-time users (local storage check)." "frontend,ux,stellar-wave"

# FE-24
create_issue "[FE-24] Governance/Voting UI" "### 📝 Description
Layout for future voting features and community proposals.

### 🛠 Tech Stack
• Framework: React / Next.js
• Role: Frontend Engineering

### 🔵 Severity: LOW

### ✅ Acceptance Criteria
- Create \`/governance\` route.
- Build placeholder cards for active proposals.
- Implement voting status badges (Active, Closed, Pending)." "frontend,governance,stellar-wave"

# FE-25
create_issue "[FE-25] Advanced Chart Filters" "### 📝 Description
Add timeframe filters to performance charts for better data granularity.

### 🛠 Tech Stack
• Framework: React / Recharts
• Role: Data Engineering

### 🟡 Severity: MEDIUM

### ✅ Acceptance Criteria
- Add 1D, 1W, 1M, 1Y filters to Recharts components.
- Update data fetching logic based on selected filters.
- Implement smooth transitions between chart states." "frontend,chart,stellar-wave"

# FE-26
create_issue "[FE-26] History Export to CSV" "### 📝 Description
Allow users to download their transaction logs for off-chain accounting.

### 🛠 Tech Stack
• Framework: React / browser-fs
• Role: Data Engineering

### 🔵 Severity: LOW

### ✅ Acceptance Criteria
- Implement CSV generation from transaction data.
- Add \"Download CSV\" button to the History component.
- Ensure proper formatting for dates and amounts." "frontend,data,stellar-wave"

# FE-27
create_issue "[FE-27] Real-time Price Tracker" "### 📝 Description
Live updates for asset prices to improve dashboard responsiveness.

### 🛠 Tech Stack
• Framework: React / WebSockets
• Role: Frontend Engineering

### 🟡 Severity: MEDIUM

### ✅ Acceptance Criteria
- Create \`usePriceTracker\` custom hook.
- Use polling or WebSockets for live data.
- Implement visual indicators for price changes (Green/Red flashes)." "frontend,hook,stellar-wave"

