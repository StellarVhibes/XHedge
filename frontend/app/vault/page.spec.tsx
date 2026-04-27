import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VaultPage from "./page";

const mockFetchVaultData = vi.fn();
const mockFetchApyData = vi.fn();
const mockWalletState: {
  connected: boolean;
  address: string | null;
  signTransaction: ReturnType<typeof vi.fn>;
} = {
  connected: true,
  address: "GBXFQY665K3S3SZESTSY3A4Y5Z6K2O3B4C5D6E7F8G9H0I1J2K3L4M5N",
  signTransaction: vi.fn(),
};

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(() => "toast-id"),
  },
}));

vi.mock("@/components/PrivacyModal", () => ({
  default: () => null,
}));

vi.mock("@/components/SigningOverlay", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/TermsModal", () => ({
  default: () => null,
}));

vi.mock("@/components/TimeframeFilter", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/VaultAPYChart", () => ({
  default: () => <div data-testid="vault-apy-chart" />,
}));

vi.mock("@/app/context/NetworkContext", () => ({
  useNetwork: () => ({ network: "TESTNET" }),
}));

vi.mock("@/app/context/PriceContext", () => ({
  usePrices: () => ({ prices: { XLM: 0.1 } }),
}));

vi.mock("@/app/context/VaultContext", () => ({
  useVault: () => ({
    optimisticBalance: 0,
    optimisticShares: 0,
    hasPending: false,
    pendingTxs: [],
    addPendingDeposit: vi.fn(() => "pending-deposit"),
    addPendingWithdraw: vi.fn(() => "pending-withdraw"),
    confirmTx: vi.fn(),
    failTx: vi.fn(),
    updateMetrics: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-wallet", () => ({
  useWallet: () => mockWalletState,
}));

vi.mock("@/lib/chart-data", () => ({
  fetchApyData: (...args: unknown[]) => mockFetchApyData(...args),
}));

vi.mock("@/lib/contracts.config", () => ({
  getVolatilityShieldAddress: () => "volatility-shield-contract",
}));

vi.mock("@/lib/i18n-context", () => ({
  useTranslations: () => (key: string) =>
    (
      {
        title: "Vault",
        deposit: "Deposit",
        withdraw: "Withdraw",
        yourBalance: "Your Balance",
        yourShares: "Your Shares",
        currentAPY: "Current APY",
        depositAmount: "Deposit Amount",
        withdrawAmount: "Withdraw Amount",
        enterAmountToDeposit: "Enter deposit amount",
        enterAmountToWithdraw: "Enter withdraw amount",
        connectWallet: "Connect Wallet",
      } as Record<string, string>
    )[key] ?? key,
}));

vi.mock("@/lib/stellar", () => ({
  buildDepositXdr: vi.fn().mockResolvedValue("deposit-xdr"),
  buildWithdrawXdr: vi.fn().mockResolvedValue("withdraw-xdr"),
  convertToAssets: vi.fn().mockResolvedValue({ assets: "0", error: null }),
  convertToShares: vi.fn().mockResolvedValue({ shares: "0", error: null }),
  estimateTransactionFee: vi.fn().mockResolvedValue({ fee: "0" }),
  fetchVaultData: (...args: unknown[]) => mockFetchVaultData(...args),
  getNetworkPassphrase: vi.fn().mockReturnValue("Test Network"),
  getSharePrice: vi.fn().mockResolvedValue({ sharePrice: "1" }),
  simulateAndAssembleTransaction: vi.fn().mockResolvedValue({ result: "assembled-xdr", error: null }),
  submitTransaction: vi.fn().mockResolvedValue({ hash: "tx-hash", error: null }),
}));

describe("VaultPage accessibility", () => {
  beforeEach(() => {
    mockWalletState.connected = true;
    mockWalletState.address = "GBXFQY665K3S3SZESTSY3A4Y5Z6K2O3B4C5D6E7F8G9H0I1J2K3L4M5N";
    mockWalletState.signTransaction = vi.fn();
    mockFetchVaultData.mockResolvedValue({
      totalAssets: "0",
      totalShares: "0",
      sharePrice: "1",
      userBalance: "0",
      userShares: "0",
    });
    mockFetchApyData.mockResolvedValue([]);

    const storage = createStorageMock();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("links the deposit and withdraw inputs to accessible labels and feedback", async () => {
    render(<VaultPage />);

    const depositInput = await screen.findByLabelText("Deposit amount");
    expect(depositInput).toHaveAttribute("aria-describedby", "deposit-amount-feedback");
    expect(screen.getByText("Enter the amount of XLM to deposit.")).toHaveAttribute("id", "deposit-amount-feedback");

    fireEvent.change(depositInput, { target: { value: "-1" } });
    await waitFor(() => {
      expect(depositInput).toHaveAttribute("aria-invalid", "true");
    });
    expect(screen.getByText("Enter an amount greater than 0.")).toHaveAttribute("id", "deposit-amount-feedback");

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    const withdrawInput = await screen.findByLabelText("Withdraw amount");
    expect(withdrawInput).toHaveAttribute("aria-describedby", "withdraw-amount-feedback");
    expect(document.getElementById("withdraw-amount-feedback")).toBeTruthy();

    fireEvent.change(withdrawInput, { target: { value: "1" } });
    await waitFor(() => {
      expect(withdrawInput).toHaveAttribute("aria-invalid", "true");
    });
    expect(screen.getByText("Insufficient balance. You have 0.00 shares.")).toHaveAttribute(
      "id",
      "withdraw-amount-feedback"
    );
  });

  it("has no critical axe violations on the vault page", async () => {
    mockWalletState.connected = false;
    mockWalletState.address = null;

    const { container } = render(<VaultPage />);
    await screen.findByText("Vault");

    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa"],
      },
    });

    const criticalViolations = results.violations.filter((violation) => violation.impact === "critical");
    expect(criticalViolations, JSON.stringify(criticalViolations, null, 2)).toHaveLength(0);
  });
});

function createStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}
