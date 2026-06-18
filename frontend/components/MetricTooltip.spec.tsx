import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { MetricTooltip } from "./MetricTooltip";

afterEach(cleanup);

describe("MetricTooltip", () => {
  it("renders the label text", () => {
    render(<MetricTooltip label="APY" tip="Annualised percentage yield." />);
    expect(screen.getByText("APY")).toBeInTheDocument();
  });

  it("tooltip is hidden by default", () => {
    render(<MetricTooltip label="TVL" tip="Total value locked." />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows tooltip on mouse enter and hides on mouse leave", () => {
    render(<MetricTooltip label="TVL" tip="Total value locked in the vault." />);
    const btn = screen.getByRole("button", { name: /more info about tvl/i });

    fireEvent.mouseEnter(btn);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Total value locked in the vault.");

    fireEvent.mouseLeave(btn);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows tooltip on focus and hides on blur", () => {
    render(<MetricTooltip label="Share Price" tip="Value of one vault share." />);
    const btn = screen.getByRole("button", { name: /more info about share price/i });

    fireEvent.focus(btn);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Value of one vault share.");

    fireEvent.blur(btn);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("closes tooltip on Escape key", () => {
    render(<MetricTooltip label="APY" tip="Annualised percentage yield." />);
    const btn = screen.getByRole("button", { name: /more info about apy/i });

    fireEvent.focus(btn);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.keyDown(btn, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("button has aria-expanded=false when closed and true when open", () => {
    render(<MetricTooltip label="APY" tip="Annualised percentage yield." />);
    const btn = screen.getByRole("button", { name: /more info about apy/i });

    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.focus(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("tooltip content is ≤ 2 sentences for each metric", () => {
    const metrics = [
      { label: "APY", tip: "Annualised percentage yield earned by the vault, derived from share price growth. Higher APY means faster compounding." },
      { label: "TVL", tip: "The total value of all assets currently deposited and managed by this vault." },
      { label: "Share Price", tip: "The current value of one vault share in the deposit asset. Share price rises as the vault earns yield." },
      { label: "Strategy Health", tip: "Strategy health reflects on-chain risk signals. Flagged strategies may be paused or rebalanced." },
      { label: "Allocation %", tip: "The percentage of vault assets assigned to this strategy. Drift from target may trigger a rebalance." },
      { label: "Harvest Yield", tip: "Assets collected during the last harvest event and redistributed to vault depositors as yield." },
    ];

    metrics.forEach(({ label, tip }) => {
      // Count sentences: split on ". " or end-of-string after punctuation
      const sentences = tip.split(/(?<=[.!?])\s+/).filter(Boolean);
      expect(sentences.length, `"${label}" tip has more than 2 sentences`).toBeLessThanOrEqual(2);
    });
  });
});
