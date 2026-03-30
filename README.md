# XHedge 🛡️📉

![XHedge Banner](https://placehold.co/1200x400/212121/ffffff/png?text=XHedge+Volatility+Shield)

> **A Stablecoin Volatility Shield for Weak Currencies.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar%20Soroban-purple)](https://soroban.stellar.org)

## 💡 The Idea

Even stablecoins expose users in emerging economies (like Nigeria) to FX timing risk, dollar volatility relative to local inflation, and entry/exit rate manipulation. **Stable ≠ Stable relative to local purchasing power.**

**XHedge** acts as a "Micro hedge fund for everyday Africans."

-   **User Action:** Users deposit stablecoins.
-   **AI Engine:** Predicts FX volatility and local inflation trends.
-   **Smart Allocation:** Contract automatically allocates funds into:
    -   Stablecoins (Safety)
    -   Synthetic inflation hedges (Growth)
    -   Liquidity pools (Yield)

*This is a rare narrative with a strong technical moat.*

---

## 🏗️ Architecture

```mermaid
graph TD
    User((User)) -->|Deposit USDC| UI[XHedge Dashboard]
    UI -->|Invoke| Vault[Soroban Vault Contract]
    
    subgraph AI Engine
        Data[Central Bank/FX APIs] -->|Feed| Model[FX Forecast Model]
        Model -->|Signal| Oracle[Rebalance Oracle]
    end

    subgraph On-Chain Strategy
        Oracle -->|Trigger| Vault
        Vault -->|Alloc 40%| USDC[USDC Reserves]
        Vault -->|Alloc 30%| LP[Stellar LP Positions]
        Vault -->|Alloc 30%| Synth[Synthetic Hedges]
    end
    
    Vault -->|Yield/Protection| User
```

---

## 🛠 Tech Stack

**Blockchain:**
*   Soroban asset management contract
*   Yield allocation logic
*   Stellar liquidity integration

**AI:**
*   Time-series FX forecasting
*   Inflation modeling
*   Risk scoring engine

**Data Sources:**
*   Central bank APIs
*   FX feeds
*   Market price feeds

**Frontend:**
*   Portfolio dashboard
*   Risk visualization UI

---

## 🚀 Getting Started

### 1. Prerequisites
*   Node.js v18+
*   Rust & Cargo
*   Freighter Wallet

### 2. Local Setup
(This repo is currently local-only).

**Verify Integrity:**
```bash
cargo build --all
```

**Setup Smart Contracts:**
```bash
cd smartcontract
# See docs/ISSUES-SMARTCONTRACT.md for tasks
```

**Setup Frontend:**
```bash
cd frontend
npm install
# See docs/ISSUES-FRONTEND.md for tasks
```

---

## 📚 Documentations & Trackers

*   🧠 **[Smart Contract Issues](./docs/ISSUES-SMARTCONTRACT.md)**
*   🎨 **[Frontend Issues](./docs/ISSUES-FRONTEND.md)**
*   🤖 **[Backend & AI Issues](./docs/ISSUES-BACKEND-AI.md)**

Guides:
*   📘 **[Smart Contract Guide](./docs/SMARTCONTRACT_GUIDE.md)**
*   🌐 **[Frontend Integration Guide](./docs/FRONTEND_GUIDE.md)**

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

---

*Project maintained by @bbkenny.*
