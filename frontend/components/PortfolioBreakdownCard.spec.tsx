import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { PortfolioBreakdownCard } from "./PortfolioBreakdownCard";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("../hooks/use-wallet", () => ({
  useWallet: vi.fn(),
}));

vi.mock("../app/context/NetworkContext", () => ({
  useNetwork: vi.fn(),
}));

vi.mock("../hooks/use-realtime-vault", () => ({
  useRealtimeVault: vi.fn(),
}));

vi.mock("../app/context/CurrencyContext", () => ({
  useCurrency: vi.fn(),
}));

vi.mock("../lib/stellar", () => ({
  fetchUserBasis: vi.fn(),
}));

vi.mock("../lib/contracts.config", () => ({
  getVolatilityShieldAddress: vi.fn(() => "CONTRACT_ID"),
}));

// ── Import mocked modules ─────────────────────────────────────────────────────

import * as walletHook from "../hooks/use-wallet";
import * as networkCtx from "../app/context/NetworkContext";
import * as vaultHook from "../hooks/use-realtime-vault";
import * as currencyCtx from "../app/context/CurrencyContext";
import * as stellar from "../lib/stellar";

// ── Shared defaults ────────────────────────────────────────────────────────────

const mockMetrics = {
  userShares: "10000000",   // 1 share (/ 1e7)
  totalShares: "100000000", // 10 shares
  sharePrice: "2",
};

function setupMocks({
  connected = true,
  metrics = mockMetrics,
  basisResult = Promise.resolve({ totalSharesMinted: 1, averageEntryPrice: 1.5 }),
}: {
  connected?: boolean;
  metrics?: typeof mockMetrics | null;
  basisResult?: Promise<{ totalSharesMinted: number; averageEntryPrice: number }>;
} = {}) {
  (walletHook.useWallet as ReturnType<typeof vi.fn>).mockReturnValue({
    address: "GABC123",
    connected,
  });
  (networkCtx.useNetwork as ReturnType<typeof vi.fn>).mockReturnValue({
    network: "testnet",
  });
  (vaultHook.useRealtimeVault as ReturnType<typeof vi.fn>).mockReturnValue({
    metrics,
  });
  (currencyCtx.useCurrency as ReturnType<typeof vi.fn>).mockReturnValue({
    format: (v: number) => `$${v.toFixed(2)}`,
  });
  (stellar.fetchUserBasis as ReturnType<typeof vi.fn>).mockReturnValue(basisResult);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PortfolioBreakdownCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── #428 — Skeleton loader ────────────────────────────────────────────────

  it("renders skeleton while basis is loading (isLoading = true)", async () => {
    // Never-resolving promise keeps loading state active
    setupMocks({ basisResult: new Promise(() => {}) });
    render(<PortfolioBreakdownCard />);
    expect(screen.getByTestId("portfolio-skeleton")).toBeDefined();
  });

  it("skeleton disappears and card renders after successful fetch", async () => {
    setupMocks();
    render(<PortfolioBreakdownCard />);

    // Skeleton visible initially
    expect(screen.getByTestId("portfolio-skeleton")).toBeDefined();

    // Card appears after fetch resolves
    await waitFor(() => {
      expect(screen.queryByTestId("portfolio-skeleton")).toBeNull();
      expect(screen.getByText("Your Portfolio Breakdown")).toBeDefined();
    });
  });

  it("skeleton has the same structural sections as the loaded card (3 stat rows + 2 footer items)", () => {
    setupMocks({ basisResult: new Promise(() => {}) });
    const { container } = render(<PortfolioBreakdownCard />);
    const skeleton = screen.getByTestId("portfolio-skeleton");

    // 3 stat boxes
    const statRows = skeleton.querySelectorAll(".grid > div");
    expect(statRows.length).toBe(3);

    // 2 footer price items
    const footerItems = skeleton.querySelectorAll(".border-t .grid > div");
    expect(footerItems.length).toBe(2);
  });

  // ── #427 — Error state ────────────────────────────────────────────────────

  it("shows 'P&L data unavailable' message when fetchUserBasis rejects", async () => {
    setupMocks({ basisResult: Promise.reject(new Error("network error")) });
    render(<PortfolioBreakdownCard />);

    await waitFor(() => {
      expect(screen.getByTestId("basis-error-state")).toBeDefined();
      expect(screen.getByText("P&L data unavailable")).toBeDefined();
    });
  });

  it("shows retry button when basis fetch fails", async () => {
    setupMocks({ basisResult: Promise.reject(new Error("timeout")) });
    render(<PortfolioBreakdownCard />);

    await waitFor(() => {
      expect(screen.getByTestId("basis-retry-button")).toBeDefined();
    });
  });

  it("retry button triggers a re-fetch and clears the error on success", async () => {
    const fetchMock = stellar.fetchUserBasis as ReturnType<typeof vi.fn>;
    fetchMock
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({ totalSharesMinted: 1, averageEntryPrice: 1.5 });

    setupMocks({ basisResult: Promise.reject(new Error("fail")) });
    render(<PortfolioBreakdownCard />);

    await waitFor(() => {
      expect(screen.getByTestId("basis-retry-button")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("basis-retry-button"));

    await waitFor(() => {
      expect(screen.queryByTestId("basis-error-state")).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it("does not display silent zeros as real P&L when fetch fails", async () => {
    setupMocks({ basisResult: Promise.reject(new Error("fail")) });
    render(<PortfolioBreakdownCard />);

    await waitFor(() => {
      // Should show the error state, not a numeric P&L value
      expect(screen.getByText("P&L data unavailable")).toBeDefined();
      // No green/red P&L value like "+$0.00" should be present
      expect(screen.queryByText("+$0.00")).toBeNull();
    });
  });

  // ── Baseline — renders null when not connected ────────────────────────────

  it("renders null when wallet is not connected", () => {
    setupMocks({ connected: false });
    const { container } = render(<PortfolioBreakdownCard />);
    expect(container.firstChild).toBeNull();
  });
});
