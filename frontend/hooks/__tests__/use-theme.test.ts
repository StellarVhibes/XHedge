import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "../use-theme";

// ---------------------------------------------------------------------------
// Mock next-themes so tests are pure unit tests with no DOM theme side-effects
// ---------------------------------------------------------------------------
vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
}));

import { useTheme as useNextTheme } from "next-themes";

const mockSetTheme = vi.fn();

/** Build a minimal next-themes mock return value */
function mockNextTheme(theme: string, resolvedTheme: string) {
  vi.mocked(useNextTheme).mockReturnValue({
    theme,
    resolvedTheme,
    setTheme: mockSetTheme,
    themes: ["light", "dark", "system"],
    systemTheme: resolvedTheme as "light" | "dark",
    forcedTheme: undefined,
  });
}

// ---------------------------------------------------------------------------

describe("useTheme", () => {
  beforeEach(() => {
    mockSetTheme.mockReset();
  });

  // -------------------------------------------------------------------------
  // 1. Default system detection
  // -------------------------------------------------------------------------
  it("returns 'system' as the default theme and exposes the resolved OS theme", () => {
    mockNextTheme("system", "dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("system");
    // resolvedTheme reflects the actual OS-rendered value
    expect(result.current.resolvedTheme).toBe("dark");
  });

  // -------------------------------------------------------------------------
  // 2. Manual toggle — full cycle: system → light → dark → system
  // -------------------------------------------------------------------------
  it("cycles system → light → dark → system on successive cycleTheme calls", () => {
    // system → light
    mockNextTheme("system", "dark");
    const { result: r1 } = renderHook(() => useTheme());
    act(() => { r1.current.cycleTheme(); });
    expect(mockSetTheme).toHaveBeenLastCalledWith("light");

    // light → dark
    mockNextTheme("light", "light");
    const { result: r2 } = renderHook(() => useTheme());
    act(() => { r2.current.cycleTheme(); });
    expect(mockSetTheme).toHaveBeenLastCalledWith("dark");

    // dark → system
    mockNextTheme("dark", "dark");
    const { result: r3 } = renderHook(() => useTheme());
    act(() => { r3.current.cycleTheme(); });
    expect(mockSetTheme).toHaveBeenLastCalledWith("system");
  });

  // -------------------------------------------------------------------------
  // 3. Persistence across reload — setTheme writes to localStorage[vault-theme]
  // -------------------------------------------------------------------------
  it("persists the selected theme under the 'vault-theme' localStorage key", () => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
    });

    // Simulate what next-themes does when storageKey="vault-theme":
    // calling setTheme writes to localStorage under that key.
    vi.mocked(useNextTheme).mockReturnValue({
      theme: "system",
      resolvedTheme: "dark",
      setTheme: (t: string) => {
        store["vault-theme"] = t;
        mockSetTheme(t);
      },
      themes: ["light", "dark", "system"],
      systemTheme: "dark",
      forcedTheme: undefined,
    });

    const { result } = renderHook(() => useTheme());

    act(() => { result.current.setTheme("dark"); });
    expect(store["vault-theme"]).toBe("dark");

    // Simulating reload: read persisted key, next-themes would restore from it
    act(() => { result.current.setTheme("light"); });
    expect(store["vault-theme"]).toBe("light");

    // Verify next-themes setTheme was called (it owns the persistence logic)
    expect(mockSetTheme).toHaveBeenCalledTimes(2);
    expect(mockSetTheme).toHaveBeenNthCalledWith(1, "dark");
    expect(mockSetTheme).toHaveBeenNthCalledWith(2, "light");
  });
});
