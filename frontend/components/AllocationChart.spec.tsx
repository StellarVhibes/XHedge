import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import AllocationChart, { AllocationChartEmptyState } from "./AllocationChart";

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
    const slices = [
      { name: "BTC", value: 50, color: "#f7931a" },
      { name: "ETH", value: 50, color: "#627eea" },
    ];
    render(<AllocationChart slices={slices} />);
    expect(screen.queryByText("No allocations yet")).toBeNull();
    expect(screen.getByText("BTC")).toBeDefined();
    expect(screen.getByText("ETH")).toBeDefined();
  });
});
