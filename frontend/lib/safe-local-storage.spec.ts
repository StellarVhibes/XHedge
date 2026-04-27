import { describe, expect, it, vi } from "vitest";
import { safeLocalStorage } from "./safe-local-storage";

describe("safeLocalStorage", () => {
  it("returns null when localStorage.getItem throws SecurityError", () => {
    const getItem = vi.fn(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    const setItem = vi.fn();

    Object.defineProperty(window, "localStorage", {
      value: { getItem, setItem },
      configurable: true,
    });

    expect(() => safeLocalStorage.get("terms_accepted")).not.toThrow();
    expect(safeLocalStorage.get("terms_accepted")).toBeNull();
  });

  it("returns false when localStorage.setItem throws QuotaExceededError", () => {
    const getItem = vi.fn(() => null);
    const setItem = vi.fn(() => {
      throw new DOMException("Quota", "QuotaExceededError");
    });

    Object.defineProperty(window, "localStorage", {
      value: { getItem, setItem },
      configurable: true,
    });

    expect(() => safeLocalStorage.set("k", "v")).not.toThrow();
    expect(safeLocalStorage.set("k", "v")).toBe(false);
  });
});

