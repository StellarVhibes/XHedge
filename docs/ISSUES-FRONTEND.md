# Frontend Issues - XHedge 🎨

This document tracks the detailed UI/UX and integration tasks for the dashboard.

---

## 🚀 Phase 1: Foundation

### Issue #FE-1: Project Scaffold & Theme
**Category:** `[UI]`
**Status:** ❌ PENDING
**Priority:** Critical
**Description:** Initialize Next.js 16.1.1 app with XHedge branding.
- **Tasks:**
  - [ ] Configure `tailwind.config.ts` (Dark mode focus).
  - [ ] Setup `globals.css` colors (Deep Blue/Purple).
  - [ ] Implement `Layout` with Sidebar navigation.

### Issue #FE-2: Freighter Context
**Category:** `[INTEGRATION]`
**Status:** ❌ PENDING
**Priority:** Critical
**Description:** Global wallet state management.
- **Tasks:**
  - [ ] Create `FreighterContext`.
  - [ ] Implement connection logic.
  - [ ] Auto-reconnect on refresh.

---

## 💼 Phase 2: Vault Interface

### Issue #FE-3: Vault Overview Card
**Category:** `[UI/INTEGRATION]`
**Status:** ❌ PENDING
**Priority:** High
**Description:** Display key vault metrics.
- **Tasks:**
  - [ ] Fetch `total_assets` and `total_shares`.
  - [ ] Calculate and display `Share Price`.
  - [ ] Display User's Balance (Shares * Price).
  - [ ] Display historical APY (mocked or calculated).

### Issue #FE-4: Deposit/Withdraw Module
**Category:** `[HYBRID]`
**Status:** ❌ PENDING
**Priority:** High
**Description:** The interaction core.
- **Tasks:**
  - [ ] Build Tabbed Card (Deposit | Withdraw).
  - [ ] Input field with "Max" button.
  - [ ] XDR Builder: `deposit` function.
  - [ ] XDR Builder: `withdraw` function.
  - [ ] Transaction Toast notifications.

---

## 📈 Phase 3: Analytics

### Issue #FE-5: Volatility Chart
**Category:** `[UI]`
**Status:** ❌ PENDING
**Priority:** Medium
**Description:** Visualize the AI's risk forecast.
- **Tasks:**
  - [ ] Install `recharts`.
  - [ ] Create `RiskChart` component (Line chart).
  - [ ] Fetch forecast data from Backend API.
  - [ ] Display "Current Risk Level" badge (Low/Med/High).

### Issue #FE-6: Strategy Allocation Pie
**Category:** `[UI]`
**Status:** ❌ PENDING
**Priority:** Low
**Description:** Show where funds are currently deployed.
- **Tasks:**
  - [ ] Fetch current allocation from contract.
  - [ ] Render Pie Chart (Stablecoin vs Hedge vs Yield).
