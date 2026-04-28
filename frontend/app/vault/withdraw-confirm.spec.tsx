/**
 * Tests for the large-withdrawal confirmation modal.
 *
 * Covers:
 *  - Modal appears when withdrawal > threshold % of shares
 *  - Modal does NOT appear below threshold
 *  - Modal shows share price and expected assets
 *  - Cancel returns to form (modal closes, no signing)
 *  - Confirm proceeds to signing flow
 *  - Threshold boundary (exactly at threshold does NOT trigger)
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VaultPage from "./page";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSignTransaction = vi.fn();
const mockFetchVaultData = vi.fn();
const mockFetchApyData = vi.fn();

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
  useWallet: () => ({ connected: true, address: "GTEST", signTransaction: mockSignTransaction }),
}));
vi.mock("@/lib/chart-data", () => ({ fetchApyData: (...a: unknown[]) => mockFetchApyData(...a) }));
vi.mock("@/lib/contracts.config", () => ({ getVolatilityShieldAddress: () => "contract" }));
vi.mock("@/lib/i18n-context", () => ({
  useTranslations: () => (key: string) =>
    ({ title: "Vault", deposit: "Deposit", withdraw: "Withdraw",
       yourBalance: "Your Balance", yourShares: "Your Shares", currentAPY: "Current APY",
       depositAmount: "Deposit Amount", withdrawAmount: "Withdraw Amount",
       enterAmountToDeposit: "Enter deposit amount", enterAmountToWithdraw: "Enter withdraw amount",
       legalAgreementRequired: "Legal Agreement Required", termsOfService: "Terms",
       privacyPolicy: "Privacy", continueToDeposit: "Continue",
       processing: "Processing",
     } as Record<string, string>)[key] ?? key,
}));
vi.mock("@/lib/stellar", () => ({
  buildWithdrawXdr: vi.fn().mockResolvedValue("withdraw-xdr"),
  buildDepositXdr: vi.fn().mockResolvedValue("deposit-xdr"),
  convertToAssets: vi.fn().mockResolvedValue({ assets: "0", error: null }),
  convertToShares: vi.fn().mockResolvedValue({ shares: "0", error: null }),
  estimateTransactionFee: vi.fn().mockResolvedValue({ fee: "100" }),
  fetchVaultData: (...a: unknown[]) => mockFetchVaultData(...a),
  getNetworkPassphrase: vi.fn().mockReturnValue("Test SDF Network ; September 2015"),
  getSharePrice: vi.fn().mockResolvedValue({ sharePrice: "1.05" }),
  simulateAndAssembleTransaction: vi.fn().mockResolvedValue({ result: "assembled", error: null }),
  submitTransaction: vi.fn().mockResolvedValue({ hash: "txhash123", error: null }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function storageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    clear() { store.clear(); },
    getItem: (k) => store.get(k) ?? null,
    key: (i) => Array.from(store.keys())[i] ?? null,
    removeItem: (k) => { store.delete(k); },
    setItem: (k, v) => { store.set(k, v); },
  };
}

async function renderWithShares(userShares: number) {
  const storage = storageMock();
  storage.setItem("terms_accepted", "true");
  storage.setItem("privacy_accepted", "true");
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });

  mockFetchVaultData.mockResolvedValue({
    totalAssets: "10000000000",
    totalShares: "10000000000",
    sharePrice: "1.050000",
    userBalance: String(userShares * 1e7),
    userShares: String(userShares * 1e7),
    assetSymbol: "USDC",
  });
  mockFetchApyData.mockResolvedValue([]);

  render(<VaultPage />);
  await waitFor(() => expect(screen.queryByText("Vault")).toBeInTheDocument());

  // Switch to withdraw tab
  fireEvent.click(screen.getByRole("tab", { name: /withdraw/i }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("Large withdrawal confirmation modal", () => {
  beforeEach(() => {
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed", error: null });
  });

  it("does NOT show modal when withdrawal is below 50% threshold", async () => {
    await renderWithShares(100);
    const input = screen.getByLabelText(/withdraw amount/i);
    fireEvent.change(input, { target: { value: "49" } });
    fireEvent.click(screen.getByRole("button", { name: /^withdraw$/i }));
    await waitFor(() => expect(screen.queryByTestId("withdraw-confirm-modal")).not.toBeInTheDocument());
  });

  it("does NOT show modal at exactly 50% (boundary — not strictly greater)", async () => {
    await renderWithShares(100);
    const input = screen.getByLabelText(/withdraw amount/i);
    fireEvent.change(input, { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: /^withdraw$/i }));
    await waitFor(() => expect(screen.queryByTestId("withdraw-confirm-modal")).not.toBeInTheDocument());
  });

  it("shows modal when withdrawal exceeds 50% of shares", async () => {
    await renderWithShares(100);
    const input = screen.getByLabelText(/withdraw amount/i);
    fireEvent.change(input, { target: { value: "51" } });
    fireEvent.click(screen.getByRole("button", { name: /^withdraw$/i }));
    await waitFor(() => expect(screen.getByTestId("withdraw-confirm-modal")).toBeInTheDocument());
  });

  it("modal displays share price and expected assets", async () => {
    await renderWithShares(100);
    const input = screen.getByLabelText(/withdraw amount/i);
    fireEvent.change(input, { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: /^withdraw$/i }));
    await waitFor(() => expect(screen.getByTestId("withdraw-confirm-modal")).toBeInTheDocument());

    expect(screen.getByTestId("withdraw-confirm-share-price")).toBeInTheDocument();
    expect(screen.getByTestId("withdraw-confirm-assets")).toBeInTheDocument();
    expect(screen.getByTestId("withdraw-confirm-shares")).toHaveTextContent("60.0000 XHS");
  });

  it("Cancel closes the modal and returns to form", async () => {
    await renderWithShares(100);
    const input = screen.getByLabelText(/withdraw amount/i);
    fireEvent.change(input, { target: { value: "75" } });
    fireEvent.click(screen.getByRole("button", { name: /^withdraw$/i }));
    await waitFor(() => expect(screen.getByTestId("withdraw-confirm-modal")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("withdraw-confirm-cancel"));
    await waitFor(() => expect(screen.queryByTestId("withdraw-confirm-modal")).not.toBeInTheDocument());
    // Input still has the value — user is back on the form
    expect(screen.getByLabelText(/withdraw amount/i)).toHaveValue(75);
  });

  it("Confirm proceeds to signing flow", async () => {
    await renderWithShares(100);
    const input = screen.getByLabelText(/withdraw amount/i);
    fireEvent.change(input, { target: { value: "75" } });
    fireEvent.click(screen.getByRole("button", { name: /^withdraw$/i }));
    await waitFor(() => expect(screen.getByTestId("withdraw-confirm-modal")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("withdraw-confirm-proceed"));
    await waitFor(() => expect(mockSignTransaction).toHaveBeenCalled());
  });
});
