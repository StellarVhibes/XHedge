/**
 * Tests for ARIA tablist keyboard navigation on the vault tab bar.
 *
 * Covers:
 *  - Correct ARIA roles (tablist, tab, tabpanel)
 *  - ArrowRight / ArrowLeft navigate between tabs
 *  - Home / End jump to first / last tab
 *  - Active tab has tabIndex=0; inactive has tabIndex=-1
 *  - Focus ring class is present on focused tab
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VaultPage from "./page";

// ── Mocks (same as page.spec.tsx) ─────────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), loading: vi.fn(() => "tid") },
}));
vi.mock("@/components/PrivacyModal", () => ({ default: () => null }));
vi.mock("@/components/SigningOverlay", () => ({ default: () => null }));
vi.mock("@/components/TermsModal", () => ({ default: () => null }));
vi.mock("@/components/TimeframeFilter", () => ({ default: () => null }));
vi.mock("@/components/VaultAPYChart", () => ({ default: () => <div /> }));
vi.mock("@/app/context/NetworkContext", () => ({ useNetwork: () => ({ network: "TESTNET" }) }));
vi.mock("@/app/context/PriceContext", () => ({ usePrices: () => ({ prices: { XLM: 0.1 } }) }));
vi.mock("@/app/context/VaultContext", () => ({
  useVault: () => ({
    optimisticBalance: 0, optimisticShares: 0, hasPending: false, pendingTxs: [],
    addPendingDeposit: vi.fn(() => "pd"), addPendingWithdraw: vi.fn(() => "pw"),
    confirmTx: vi.fn(), failTx: vi.fn(), updateMetrics: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-wallet", () => ({
  useWallet: () => ({ connected: false, address: null, signTransaction: vi.fn() }),
}));
vi.mock("@/lib/chart-data", () => ({ fetchApyData: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/contracts.config", () => ({ getVolatilityShieldAddress: () => "contract" }));
vi.mock("@/lib/i18n-context", () => ({
  useTranslations: () => (key: string) =>
    ({ title: "Vault", deposit: "Deposit", withdraw: "Withdraw",
       yourBalance: "Your Balance", yourShares: "Your Shares", currentAPY: "Current APY",
       depositAmount: "Deposit Amount", withdrawAmount: "Withdraw Amount",
       enterAmountToDeposit: "Enter deposit amount", enterAmountToWithdraw: "Enter withdraw amount",
       legalAgreementRequired: "Legal Agreement Required", termsOfService: "Terms",
       privacyPolicy: "Privacy", continueToDeposit: "Continue", processing: "Processing",
     } as Record<string, string>)[key] ?? key,
}));
vi.mock("@/lib/stellar", () => ({
  buildDepositXdr: vi.fn().mockResolvedValue("xdr"),
  buildWithdrawXdr: vi.fn().mockResolvedValue("xdr"),
  convertToAssets: vi.fn().mockResolvedValue({ assets: "0", error: null }),
  convertToShares: vi.fn().mockResolvedValue({ shares: "0", error: null }),
  estimateTransactionFee: vi.fn().mockResolvedValue({ fee: "100" }),
  fetchVaultData: vi.fn().mockResolvedValue({ totalAssets: "0", totalShares: "0", sharePrice: "1", userBalance: "0", userShares: "0" }),
  getNetworkPassphrase: vi.fn().mockReturnValue("Test SDF Network ; September 2015"),
  getSharePrice: vi.fn().mockResolvedValue({ sharePrice: "1" }),
  simulateAndAssembleTransaction: vi.fn().mockResolvedValue({ result: "assembled", error: null }),
  submitTransaction: vi.fn().mockResolvedValue({ hash: "hash", error: null }),
}));

afterEach(cleanup);

describe("Vault tab bar — ARIA roles and keyboard navigation", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        get length() { return storage.size; },
        clear: () => storage.clear(),
        getItem: (k: string) => storage.get(k) ?? null,
        key: (i: number) => Array.from(storage.keys())[i] ?? null,
        removeItem: (k: string) => storage.delete(k),
        setItem: (k: string, v: string) => storage.set(k, v),
      },
    });
  });

  function getTabList() {
    return screen.getByRole("tablist");
  }
  function getDepositTab() {
    return screen.getByRole("tab", { name: /deposit/i });
  }
  function getWithdrawTab() {
    return screen.getByRole("tab", { name: /withdraw/i });
  }

  it("renders tablist, tab, and tabpanel roles", async () => {
    render(<VaultPage />);
    await screen.findByText("Vault");

    expect(getTabList()).toBeInTheDocument();
    expect(getDepositTab()).toBeInTheDocument();
    expect(getWithdrawTab()).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("deposit tab is selected by default", async () => {
    render(<VaultPage />);
    await screen.findByText("Vault");

    expect(getDepositTab()).toHaveAttribute("aria-selected", "true");
    expect(getWithdrawTab()).toHaveAttribute("aria-selected", "false");
  });

  it("active tab has tabIndex=0, inactive has tabIndex=-1", async () => {
    render(<VaultPage />);
    await screen.findByText("Vault");

    expect(getDepositTab()).toHaveAttribute("tabindex", "0");
    expect(getWithdrawTab()).toHaveAttribute("tabindex", "-1");
  });

  it("ArrowRight moves focus to withdraw tab", async () => {
    render(<VaultPage />);
    await screen.findByText("Vault");

    fireEvent.keyDown(getTabList(), { key: "ArrowRight" });
    await waitFor(() => expect(getWithdrawTab()).toHaveAttribute("aria-selected", "true"));
    expect(getDepositTab()).toHaveAttribute("aria-selected", "false");
  });

  it("ArrowLeft wraps back to deposit from withdraw", async () => {
    render(<VaultPage />);
    await screen.findByText("Vault");

    // Go to withdraw first
    fireEvent.keyDown(getTabList(), { key: "ArrowRight" });
    await waitFor(() => expect(getWithdrawTab()).toHaveAttribute("aria-selected", "true"));

    // Arrow left back
    fireEvent.keyDown(getTabList(), { key: "ArrowLeft" });
    await waitFor(() => expect(getDepositTab()).toHaveAttribute("aria-selected", "true"));
  });

  it("ArrowRight wraps from last tab back to first", async () => {
    render(<VaultPage />);
    await screen.findByText("Vault");

    fireEvent.keyDown(getTabList(), { key: "ArrowRight" }); // → withdraw
    await waitFor(() => expect(getWithdrawTab()).toHaveAttribute("aria-selected", "true"));

    fireEvent.keyDown(getTabList(), { key: "ArrowRight" }); // wraps → deposit
    await waitFor(() => expect(getDepositTab()).toHaveAttribute("aria-selected", "true"));
  });

  it("Home key jumps to first tab", async () => {
    render(<VaultPage />);
    await screen.findByText("Vault");

    fireEvent.keyDown(getTabList(), { key: "ArrowRight" }); // go to withdraw
    await waitFor(() => expect(getWithdrawTab()).toHaveAttribute("aria-selected", "true"));

    fireEvent.keyDown(getTabList(), { key: "Home" });
    await waitFor(() => expect(getDepositTab()).toHaveAttribute("aria-selected", "true"));
  });

  it("End key jumps to last tab", async () => {
    render(<VaultPage />);
    await screen.findByText("Vault");

    fireEvent.keyDown(getTabList(), { key: "End" });
    await waitFor(() => expect(getWithdrawTab()).toHaveAttribute("aria-selected", "true"));
  });

  it("tabpanel aria-labelledby matches active tab id", async () => {
    render(<VaultPage />);
    await screen.findByText("Vault");

    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", "tab-deposit");

    fireEvent.keyDown(getTabList(), { key: "ArrowRight" });
    await waitFor(() => expect(panel).toHaveAttribute("aria-labelledby", "tab-withdraw"));
  });

  it("tab buttons have visible focus ring class", async () => {
    render(<VaultPage />);
    await screen.findByText("Vault");

    expect(getDepositTab().className).toContain("focus-visible:ring-2");
    expect(getWithdrawTab().className).toContain("focus-visible:ring-2");
  });
});
