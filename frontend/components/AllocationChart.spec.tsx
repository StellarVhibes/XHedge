import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import AllocationChart, { AllocationChartEmptyState } from "./AllocationChart";

const baseSlices = [
  { name: "BTC", value: 50, color: "#f7931a" },
  { name: "ETH", value: 50, color: "#627eea" },
];

describe("AllocationChart", () => {
  it("renders empty state when slices array is empty", () => {
    render(<AllocationChart slices={[]} />);
    expect(screen.getByText("No allocations yet")).toBeDefined();
  });

  it("renders empty state as a standalone component", () => {
    render(<AllocationChartEmptyState />);
    expect(screen.getByText("No allocations yet")).toBeDefined();
  });

  it("renders chart when slices are provided", () => {
    render(<AllocationChart slices={baseSlices} />);
    expect(screen.queryByText("No allocations yet")).toBeNull();
    expect(screen.getByText("BTC")).toBeDefined();
    expect(screen.getByText("ETH")).toBeDefined();
  });

  // ── #426 — Mobile legend responsive width ───────────────────────────────────
  it("legend uses w-full sm:w-56 instead of fixed w-56", () => {
    const { container } = render(<AllocationChart slices={baseSlices} />);
    const legend = container.querySelector(".w-full.sm\\:w-56");
    expect(legend).not.toBeNull();
  });

  it("legend item text uses break-words to prevent overflow on narrow viewports", () => {
    const { container } = render(<AllocationChart slices={baseSlices} />);
    const breakItems = container.querySelectorAll(".break-words");
    expect(breakItems.length).toBeGreaterThan(0);
  });

  // ── #425 — Strategy modal deduplication ────────────────────────────────────
  it("calls onSliceClick only once for rapid double-clicks on the same slice", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    render(<AllocationChart slices={baseSlices} onSliceClick={handler} />);

    const slice = screen.getByTestId("allocation-slice-0");
    fireEvent.click(slice);
    fireEvent.click(slice); // second click ignored while first is loading

    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  it("blocks other slices while one is loading via pointer-events", async () => {
    let resolve!: () => void;
    const handler = vi.fn(
      () => new Promise<void>((res) => { resolve = res; })
    );

    render(<AllocationChart slices={baseSlices} onSliceClick={handler} />);

    const slice0 = screen.getByTestId("allocation-slice-0");
    const slice1 = screen.getByTestId("allocation-slice-1");

    fireEvent.click(slice0);

    await waitFor(() => {
      expect(slice1.style.pointerEvents).toBe("none");
    });

    resolve();
  });

  it("sets aria-busy on the loading slice", async () => {
    let resolve!: () => void;
    const handler = vi.fn(
      () => new Promise<void>((res) => { resolve = res; })
    );

    render(<AllocationChart slices={baseSlices} onSliceClick={handler} />);
    const slice0 = screen.getByTestId("allocation-slice-0");
    fireEvent.click(slice0);

    await waitFor(() => {
      expect(slice0.getAttribute("aria-busy")).toBe("true");
    });

    resolve();
  });
});
