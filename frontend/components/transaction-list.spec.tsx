import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionList } from "./transaction-list";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFetchHistory = vi.fn();

vi.mock("@/hooks/use-wallet", () => ({
  useWallet: () => ({ connected: true, address: "GTEST123" }),
}));

vi.mock("@/app/context/NetworkContext", () => ({
  useNetwork: () => ({ network: "TESTNET" }),
}));

vi.mock("@/lib/stellar", () => ({
  fetchTransactionHistory: (...args: unknown[]) => mockFetchHistory(...args),
}));

vi.mock("@/lib/contracts.config", () => ({
  getVolatilityShieldAddress: () => "contract-id",
}));

vi.mock("@/app/components/VirtualizedTable", () => ({
  default: ({ data }: { data: unknown[] }) => (
    <div data-testid="virtualized-table">
      {(data as Array<{ type: string; hash: string; amount: string; asset: string; status: string; date: string }>).map((row, i) => (
        <div key={i} data-testid="tx-row">
          <span data-testid="tx-type">{row.type}</span>
          <span data-testid="tx-hash">{row.hash}</span>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/StaleBadge", () => ({
  StaleBadge: () => null,
}));

vi.mock("@/components/ui/skeleton", () => ({
  TransactionListSkeleton: () => <div data-testid="skeleton" />,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeTx = (type: string, hash: string) => ({
  type,
  hash,
  amount: "100",
  asset: "USDC",
  status: "success",
  date: "2024-01-01",
});

const FIXTURES = [
  makeTx("deposit", "0xabc123"),
  makeTx("withdraw", "0xdef456"),
  makeTx("harvest", "0xghi789"),
  makeTx("rebalance", "0xjkl012"),
  makeTx("deposit", "0xmno345"),
];

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("TransactionList — search & filter", () => {
  beforeEach(() => {
    mockFetchHistory.mockResolvedValue(FIXTURES);
  });

  async function renderAndWait() {
    render(<TransactionList />);
    await waitFor(() => expect(screen.getByTestId("virtualized-table")).toBeInTheDocument());
  }

  it("renders all transactions initially", async () => {
    await renderAndWait();
    expect(screen.getAllByTestId("tx-row")).toHaveLength(5);
  });

  it("filters by hash substring", async () => {
    await renderAndWait();
    fireEvent.change(screen.getByTestId("tx-search-input"), { target: { value: "abc" } });
    await waitFor(() => expect(screen.getAllByTestId("tx-row")).toHaveLength(1));
    expect(screen.getByTestId("tx-hash")).toHaveTextContent("0xabc123");
  });

  it("filters by type name via search input", async () => {
    await renderAndWait();
    fireEvent.change(screen.getByTestId("tx-search-input"), { target: { value: "harvest" } });
    await waitFor(() => expect(screen.getAllByTestId("tx-row")).toHaveLength(1));
    expect(screen.getByTestId("tx-type")).toHaveTextContent("harvest");
  });

  it("type dropdown filters to Deposit only", async () => {
    await renderAndWait();
    fireEvent.change(screen.getByTestId("tx-type-filter"), { target: { value: "Deposit" } });
    await waitFor(() => expect(screen.getAllByTestId("tx-row")).toHaveLength(2));
    screen.getAllByTestId("tx-type").forEach((el) => expect(el).toHaveTextContent("deposit"));
  });

  it("type dropdown filters to Withdraw only", async () => {
    await renderAndWait();
    fireEvent.change(screen.getByTestId("tx-type-filter"), { target: { value: "Withdraw" } });
    await waitFor(() => expect(screen.getAllByTestId("tx-row")).toHaveLength(1));
    expect(screen.getByTestId("tx-type")).toHaveTextContent("withdraw");
  });

  it("combined search + type filter works", async () => {
    await renderAndWait();
    fireEvent.change(screen.getByTestId("tx-type-filter"), { target: { value: "Deposit" } });
    fireEvent.change(screen.getByTestId("tx-search-input"), { target: { value: "abc" } });
    await waitFor(() => expect(screen.getAllByTestId("tx-row")).toHaveLength(1));
    expect(screen.getByTestId("tx-hash")).toHaveTextContent("0xabc123");
  });

  it("shows no-results state when filter yields zero matches", async () => {
    await renderAndWait();
    fireEvent.change(screen.getByTestId("tx-search-input"), { target: { value: "zzznomatch" } });
    await waitFor(() => expect(screen.getByTestId("tx-no-results")).toBeInTheDocument());
    expect(screen.getByTestId("tx-no-results")).toHaveTextContent("No transactions match your filters.");
  });

  it("clear button resets both search and type filter", async () => {
    await renderAndWait();
    fireEvent.change(screen.getByTestId("tx-type-filter"), { target: { value: "Harvest" } });
    fireEvent.change(screen.getByTestId("tx-search-input"), { target: { value: "ghi" } });
    await waitFor(() => expect(screen.getAllByTestId("tx-row")).toHaveLength(1));

    fireEvent.click(screen.getByTestId("tx-clear-filters"));
    await waitFor(() => expect(screen.getAllByTestId("tx-row")).toHaveLength(5));
    expect(screen.getByTestId("tx-search-input")).toHaveValue("");
    expect(screen.getByTestId("tx-type-filter")).toHaveValue("All");
  });

  it("clear button is not shown when no filter is active", async () => {
    await renderAndWait();
    expect(screen.queryByTestId("tx-clear-filters")).not.toBeInTheDocument();
  });
});
