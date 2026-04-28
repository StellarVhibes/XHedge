import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/hooks/use-wallet", () => ({
  useWallet: () => ({
    connected: false,
    address: null,
    signTransaction: vi.fn(),
  }),
}));

vi.mock("@/app/context/NetworkContext", () => ({
  useNetwork: () => ({ network: "testnet" }),
}));

vi.mock("@/app/context/PriceContext", () => ({
  usePrices: () => ({ prices: { XLM: 0 } }),
}));

vi.mock("@/app/context/VaultContext", () => ({
  useVault: () => ({
    optimisticBalance: 0,
    optimisticShares: 0,
    hasPending: false,
    pendingTxs: [],
    addPendingDeposit: vi.fn(() => "p1"),
    addPendingWithdraw: vi.fn(() => "p2"),
    confirmTx: vi.fn(),
    failTx: vi.fn(),
    updateMetrics: vi.fn(),
  }),
}));

vi.mock("@/lib/contracts.config", () => ({
  getVolatilityShieldAddress: () => "C_TEST_CONTRACT",
}));

vi.mock("@/lib/i18n-context", () => ({
  useTranslations: () => ((key: string) => key),
}));

vi.mock("@/lib/chart-data", () => ({
  fetchApyData: vi.fn(async () => []),
}));

vi.mock("@/lib/stellar", () => ({
  fetchVaultData: vi.fn(async () => ({
    totalAssets: "0",
    totalShares: "0",
    sharePrice: "1.000000000",
    userBalance: "0",
    userShares: "0",
    assetSymbol: "USDC",
  })),
}));

vi.mock("@/components/TermsModal", () => ({ default: () => null }));
vi.mock("@/components/PrivacyModal", () => ({ default: () => null }));
vi.mock("@/components/SigningOverlay", () => ({ default: () => null }));
vi.mock("@/components/VaultAPYChart", () => ({ default: () => null }));
vi.mock("@/components/TimeframeFilter", () => ({ default: () => null }));
vi.mock("@/components/ui/modal", () => ({ Modal: () => null }));

import VaultPage from "./page";

describe("VaultPage localStorage safety", () => {
  it("renders even if localStorage.getItem throws (private browsing)", () => {
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: () => {
          throw new DOMException("Blocked", "SecurityError");
        },
        setItem: () => {
          throw new DOMException("Blocked", "SecurityError");
        },
      },
      configurable: true,
    });

    expect(() => render(<VaultPage />)).not.toThrow();
  });
});

