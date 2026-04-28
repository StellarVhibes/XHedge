import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { RewardSummary } from "./reward-summary";
import * as stellar from "../lib/stellar";
import * as wallet from "../hooks/use-wallet";

vi.mock("../lib/stellar", () => ({
    fetchReferralData: vi.fn(),
}));

vi.mock("../hooks/use-wallet", () => ({
    useWallet: vi.fn(),
}));

describe("RewardSummary", () => {
    const mockAddress = "GABC...123";

    beforeEach(() => {
        vi.clearAllMocks();
        (wallet.useWallet as any).mockReturnValue({ address: mockAddress });
    });

    it("renders loading state initially", async () => {
        (stellar.fetchReferralData as any).mockReturnValue(new Promise(() => {}));
        render(<RewardSummary />);
        expect(screen.getAllByText("...").length).toBeGreaterThan(0);
    });

    it("renders data when fetch is successful", async () => {
        const mockData = {
            totalEarnings: "100.00",
            pendingEarnings: "10.00",
            recentRewards: [],
        };
        (stellar.fetchReferralData as any).mockResolvedValue(mockData);
        
        render(<RewardSummary />);
        
        await waitFor(() => {
            expect(screen.getByText("$100.00")).toBeDefined();
            expect(screen.getByText("$10.00")).toBeDefined();
        });
    });

    it("renders error message and retry button when fetch fails", async () => {
        (stellar.fetchReferralData as any).mockRejectedValue(new Error("Fetch failed"));
        
        render(<RewardSummary />);
        
        await waitFor(() => {
            expect(screen.getByText("Unable to load referral data")).toBeDefined();
            expect(screen.getByText("Retry")).toBeDefined();
        });
    });

    it("retries fetching data when Retry button is clicked", async () => {
        const fetchSpy = (stellar.fetchReferralData as any).mockRejectedValueOnce(new Error("Fetch failed"))
                                                          .mockResolvedValueOnce({
                                                              totalEarnings: "200.00",
                                                              pendingEarnings: "20.00",
                                                              recentRewards: [],
                                                          });
        
        render(<RewardSummary />);
        
        await waitFor(() => {
            expect(screen.getByText("Unable to load referral data")).toBeDefined();
        });
        
        const retryButton = screen.getByText("Retry");
        fireEvent.click(retryButton);
        
        await waitFor(() => {
            expect(screen.getByText("$200.00")).toBeDefined();
            expect(screen.queryByText("Unable to load referral data")).toBeNull();
        });
        
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
});
