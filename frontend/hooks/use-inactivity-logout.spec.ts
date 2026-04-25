import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { inactivityLogoutEvents, useInactivityLogout } from "./use-inactivity-logout";

describe("useInactivityLogout warning threshold", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits warningThreshold exactly 60 seconds before timeout", () => {
    vi.useFakeTimers();

    const timeoutMs = 5 * 60 * 1000;
    const onLogout = vi.fn();

    let warningEvents = 0;
    const handler = () => {
      warningEvents += 1;
    };

    inactivityLogoutEvents.addEventListener("warningThreshold", handler);

    const { unmount } = renderHook(() =>
      useInactivityLogout({
        timeout: timeoutMs,
        onLogout,
      })
    );

    act(() => {
      vi.advanceTimersByTime(timeoutMs - 60_000 - 1);
    });

    expect(warningEvents).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(warningEvents).toBe(1);

    unmount();
    inactivityLogoutEvents.removeEventListener("warningThreshold", handler);
  });
});
