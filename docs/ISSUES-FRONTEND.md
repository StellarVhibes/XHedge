# Frontend Issues - XHedge 🎨

This document tracks the detailed UI/UX and integration tasks for the dashboard.

---

## 🚀 Module 4: Foundation & Config (Issues FE-19 to FE-22)

### Issue #FE-19: Project Scaffold & Theme [COMPLETED]
**Priority:** Critical
**Labels:** `frontend`, `config`
**Description:** Initialize Next.js 16.1.1 app with XHedge branding.
- **Tasks:**
  - [x] Configure `tailwind.config.ts` (Dark mode focus).
  - [x] Setup `globals.css` colors (Deep Blue/Purple).
  - [x] Implement `Layout` with Sidebar navigation.

### Issue #FE-20: Freighter Context [COMPLETED]
**Priority:** Critical
**Labels:** `frontend`, `wallet`
**Description:** Global wallet state management.
- **Tasks:**
  - [x] Create `FreighterContext`.
  - [x] Implement connection logic.
  - [x] Auto-reconnect on refresh.

### Issue #FE-21: Stellar RPC Configuration [COMPLETED]
**Priority:** High
**Labels:** `frontend`, `config`
**Description:** Setup network connection to Soroban Futurenet/Mainnet.
- **Tasks:**
  - [x] Create `network.ts` config file.
  - [x] Implement `getProvider` helper.

### Issue #FE-22: Component Library Setup [COMPLETED]
**Priority:** Medium
**Labels:** `frontend`, `ui`
**Description:** Install and configure ShadcnUI/Radix.
- **Tasks:**
  - [x] Install base components (Button, Card, Input).
  - [x] Configure `components.json`.

---

## 💼 Module 5: Vault Interface (Issues FE-23 to FE-27)

### Issue #FE-23: Vault Overview Card [COMPLETED]
**Priority:** High
**Labels:** `frontend`, `feature`
**Description:** Display key vault metrics.
- **Tasks:**
  - [x] Fetch `total_assets` and `total_shares`.
  - [x] Calculate and display `Share Price`.
  - [x] Display User's Balance.

### Issue #FE-24: Deposit Tab Logic [COMPLETED]
**Priority:** High
**Labels:** `frontend`, `interaction`
**Description:** UI and logic for depositing funds.
- **Tasks:**
  - [x] Create Deposit Form (Input + Button).
  - [x] Build XDR for `deposit` call.
  - [x] Handle sign & submit flow.

### Issue #FE-25: Withdraw Tab Logic [COMPLETED]
**Priority:** High
**Labels:** `frontend`, `interaction`
**Description:** UI and logic for withdrawing funds.
- **Tasks:**
  - [x] Create Withdraw Form.
  - [x] Build XDR for `withdraw` call.
  - [x] Validate sufficient balance.

### Issue #FE-26: Transaction History List
**Priority:** Medium
**Labels:** `frontend`, `data`
**Description:** Show recent user actions.
- **Tasks:**
  - [ ] Fetch events from indexer (e.g., Mercury).
  - [ ] Render list of Deposits/Withdrawals.

### Issue #FE-27: Vault APY Chart
**Priority:** Medium
**Labels:** `frontend`, `chart`
**Description:** Historical performance visualization.
- **Tasks:**
  - [ ] Integrate `recharts`.
  - [ ] Fetch historical share price data.
  - [ ] Render area chart.

---

## 📈 Module 6: Analytics & AI (Issues FE-28 to FE-30)

### Issue #FE-28: Volatility Dashboard
**Priority:** Medium
**Labels:** `frontend`, `analytics`
**Description:** Visualize the AI's risk forecast.
- **Tasks:**
  - [ ] Create `RiskChart` component.
  - [ ] Display "Current Risk Level" badge.

### Issue #FE-29: Strategy Allocation Pie
**Priority:** Low
**Labels:** `frontend`, `chart`
**Description:** Show where funds are currently deployed.
- **Tasks:**
  - [ ] Fetch current allocation from contract.
  - [ ] Render Pie Chart.

### Issue #FE-30: AI Insight Stream [COMPLETED]
**Priority:** Low
**Labels:** `frontend`, `ai`
**Description:** Text feed of AI decisions.
- **Tasks:**
  - [x] Create scrolling log component.
  - [x] Format "Rebalance Triggered" messages.

---

## 💎 Module 7: Advanced Portfolio Features (Issues FE-31 to FE-35)

### Issue #FE-31: Multi-Currency Support
**Priority:** Medium
**Labels:** `frontend`, `feature`
**Description:** Support toggling between local currency (NGN) and USD.
- **Tasks:**
  - [ ] Implement currency switcher in Header.
  - [ ] Apply conversion factor to all numeric displays.

### Issue #FE-32: Transaction Signing Overlay
**Priority:** High
**Labels:** `frontend`, `ux`
**Description:** Full-screen overlay while waiting for wallet signature.
- **Tasks:**
  - [ ] Create `SigningOverlay` component.
  - [ ] Add loading animations and status messages.

### Issue #FE-33: Network Switcher UI [COMPLETED]
**Priority:** High
**Labels:** `frontend`, `config`
**Description:** Allow users to switch between Mainnet and Testnet.
- **Tasks:**
  - [x] Implement network selector in Sidebar.
  - [x] Trigger re-initialization of Stellar providers.

### Issue #FE-34: User Settings Profile
**Priority:** Medium
**Labels:** `frontend`, `settings`
**Description:** Dedicated page for user preferences.
- **Tasks:**
  - [ ] Build `/settings` page route.
  - [ ] Implement notification and display preferences.

### Issue #FE-35: Referral Rewards Dashboard [COMPLETED]
**Priority:** Low
**Labels:** `frontend`, `marketing`
**Description:** UI for tracking referral bonuses.
- **Tasks:**
  - [x] Design referral link sharing card.
  - [x] Fetch and display referral earnings.

---

## ✨ Module 8: UX Polish & Feedback (Issues FE-36 to FE-40)

### Issue #FE-36: Dark/Light Mode Refinement [COMPLETED]
**Priority:** Medium
**Labels:** `frontend`, `ui`
**Description:** Polish theme transitions and contrast.
- **Tasks:**
  - [x] Fix color contrast issues in Light Mode.
  - [x] Ensure smooth CSS transitions between themes.

### Issue #FE-37: Error Boundary & Toasts
**Priority:** High
**Labels:** `frontend`, `security`
**Description:** Implement robust error handling.
- **Tasks:**
  - [ ] Set up React Error Boundaries.
  - [ ] Integrate `sonner` or `react-hot-toast` for notifications.

### Issue #FE-38: Multi-Language (i18n) Support
**Priority:** Low
**Labels:** `frontend`, `internationalization`
**Description:** Prepare codebase for localization.
- **Tasks:**
  - [ ] Set up `next-intl` or similar library.
  - [ ] Extract hardcoded strings to translation files.

### Issue #FE-39: Performance Optimization
**Priority:** Medium
**Labels:** `frontend`, `optimization`
**Description:** Optimize chart and list rendering.
- **Tasks:**
  - [ ] Implement `React.memo` on heavy components.
  - [ ] Virtualize long transaction history lists.

### Issue #FE-40: Mobile Responsiveness Audit [COMPLETED]
**Priority:** High
**Labels:** `frontend`, `ui`
**Description:** Ensure full functionality on smartphones.
- **Tasks:**
  - [x] Audit all pages on mobile viewports.
  - [x] Fix navigation menu and table overflows.



### Issue #FE-41: Onboarding Tour Component
**Priority:** Medium
**Labels:** `frontend`, `ux`
**Description:** Guide new users through the dashboard.
- **Tasks:**
  - [ ] Integrate a tour library (e.g., `react-joyride`).
  - [ ] Define steps for Treasury and Strategy sections.

### Issue #FE-42: Governance/Voting UI
**Priority:** Low
**Labels:** `frontend`, `governance`
**Description:** Layout for future voting features.
- **Tasks:**
  - [ ] Create `/governance` route.
  - [ ] Build placeholder cards for active proposals.

### Issue #FE-43: Advanced Chart Filters
**Priority:** Medium
**Labels:** `frontend`, `chart`
**Description:** Add timeframe filters to performance charts.
- **Tasks:**
  - [ ] Add 1D, 1W, 1M, 1Y filters to Recharts components.
  - [ ] Update data fetching logic based on filters.

### Issue #FE-44: History Export to CSV
**Priority:** Low
**Labels:** `frontend`, `data`
**Description:** Allow users to download transaction logs.
- **Tasks:**
  - [ ] Implement CSV generation from transaction data.
  - [ ] Add "Download CSV" button to History.

### Issue #FE-45: Real-time Price Tracker
**Priority:** Medium
**Labels:** `frontend`, `hook`
**Description:** Live updates for asset prices.
- **Tasks:**
  - [ ] Create `usePriceTracker` custom hook.
  - [ ] Use polling or WebSockets for live data.

---