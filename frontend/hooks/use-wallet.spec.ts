import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWallet } from "./use-wallet";

const mockSignTransaction = vi.fn();
const mockRequestAccess = vi.fn();

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn().mockResolvedValue(true),
  getPublicKey: vi.fn().mockResolvedValue("GTESTPUBLICKEY"),
  signTransaction: (...args: unknown[]) => mockSignTransaction(...args),
  getNetwork: vi.fn().mockResolvedValue("testnet"),
  requestAccess: (...args: unknown[]) => mockRequestAccess(...args),
}));

describe("useWallet reconnect flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestAccess.mockResolvedValue("GTESTPUBLICKEY");
  });

  it("retries signTransaction after reconnect on auth failure", async () => {
    mockSignTransaction
      .mockRejectedValueOnce(new Error("not_allowed"))
      .mockResolvedValueOnce("SIGNED_XDR");
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() => useWallet());

    let signed: { error: string | null; signedTxXdr: string | null } | undefined;
    await act(async () => {
      signed = await result.current.signTransaction("XDR", "PASS");
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(mockRequestAccess).toHaveBeenCalledTimes(1);
    expect(mockSignTransaction).toHaveBeenCalledTimes(2);
    expect(signed).toEqual({ error: null, signedTxXdr: "SIGNED_XDR" });
  });

  it("returns session expired when user stays disconnected", async () => {
    mockSignTransaction.mockRejectedValue(new Error("user_rejected"));
    vi.spyOn(window, "confirm").mockReturnValue(false);

    const { result } = renderHook(() => useWallet());
    let signed: { error: string | null; signedTxXdr: string | null } | undefined;
    await act(async () => {
      signed = await result.current.signTransaction("XDR", "PASS");
    });

    expect(mockRequestAccess).not.toHaveBeenCalled();
    expect(signed).toEqual({ error: "Wallet session expired", signedTxXdr: null });
  });
});
