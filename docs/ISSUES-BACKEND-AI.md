# Backend & AI Roadmap 🧠⚙️

This document tracks the FX forecasting engine and automation infrastructure.

---

## 🏗️ Phase 1: Data Pipeline

### Issue #BK-1: Forex Data Ingestion
**Category:** `[DATA]`
**Status:** ❌ PENDING
**Priority:** Critical
**Description:** Collect reliable FX data for target currencies (e.g., NGN, KES).
- **Tasks:**
  - [ ] Setup Python `ingester` service.
  - [ ] Connect to APIs (Fixer.io, OpenExchangeRates).
  - [ ] Fetch Parallel Market rates (e.g., binance P2P scraping if legal/possible).
  - [ ] Store in PostgreSQL/TimescaleDB.

### Issue #BK-2: Database Schema
**Category:** `[INFRA]`
**Status:** ❌ PENDING
**Description:** Design the schema for rates and predictions.
- **Tasks:**
  - [ ] Table: `fx_rates` (timestamp, pair, rate, source).
  - [ ] Table: `predictions` (timestamp, horizon, volatility_score).
  - [ ] Table: `vault_snapshots` (tvl, share_price).

---

## 🤖 Phase 2: AI Core

### Issue #BK-3: Volatility Prediction Model
**Category:** `[AI]`
**Status:** ❌ PENDING
**Priority:** High
**Description:** Train a model to predict volatility spikes.
- **Tasks:**
  - [ ] EDA: Analyze historical volatility clusters.
  - [ ] Train LSTM/GRU model on rate sequence.
  - [ ] Output: `VolatilityScore` (0-100).
  - [ ] Backtest strategy (e.g., "Shift to stable if Score > 80").

### Issue #BK-4: Model API
**Category:** `[API]`
**Status:** ❌ PENDING
**Description:** Serve predictions to the frontend and keeper.
- **Tasks:**
  - [ ] Setup FastAPI.
  - [ ] Endpoint: `GET /risk/current`.
  - [ ] Endpoint: `GET /risk/history` (for charts).

---

## ⚡ Phase 3: Automation

### Issue #BK-5: Keeper Bot (Rebalancer)
**Category:** `[AUTOMATION]`
**Status:** ❌ PENDING
**Priority:** High
**Description:** The off-chain worker that executes contract updates.
- **Tasks:**
  - [ ] Poll Model API every hour.
  - [ ] If allocation change needed > threshold:
    - [ ] Build `rebalance` transaction.
    - [ ] Sign with Admin Key (AWS KMS / HashiCorp Vault).
    - [ ] Submit to Soroban RPC.
