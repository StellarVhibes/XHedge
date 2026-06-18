import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnimatedNumber } from "../use-animated-number";

// ---------------------------------------------------------------------------
// rAF / cAF mocks
// ---------------------------------------------------------------------------

type RafCallback = (timestamp: number) => void;

/** Pending rAF callbacks keyed by their returned ID. */
let pending: Map<number, RafCallback>;
let nextId: number;

function setupRafMocks() {
  pending = new Map();
  nextId = 1;

  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
    const id = nextId++;
    pending.set(id, cb);
    return id;
  });

  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) => {
    pending.delete(id);
  });
}

/**
 * Drain all currently-pending rAF callbacks at `timestamp`.
 * Callbacks scheduled *during* a flush appear in the next call.
 */
function flushFrames(timestamp: number): void {
  const toRun = [...pending.values()];
  pending.clear();
  toRun.forEach((cb) => cb(timestamp));
}

// ---------------------------------------------------------------------------
// matchMedia mock helpers
// ---------------------------------------------------------------------------

function mockMatchMedia(prefersReducedMotion: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: prefersReducedMotion })),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAnimatedNumber", () => {
  beforeEach(() => {
    setupRafMocks();
    mockMatchMedia(false); // default: motion allowed
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // Initial render
  // -------------------------------------------------------------------------

  it("returns the initial value and schedules no animation on mount", () => {
    const { result } = renderHook(() => useAnimatedNumber(42));

    expect(result.current).toBe(42);
    expect(pending.size).toBe(0);
  });

  // -------------------------------------------------------------------------
  // No-op when value is unchanged
  // -------------------------------------------------------------------------

  it("does not animate when the new value equals the current value", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useAnimatedNumber(v, 600),
      { initialProps: { v: 50 } },
    );

    act(() => {
      rerender({ v: 50 });
    });

    expect(pending.size).toBe(0);
    expect(result.current).toBe(50);
  });

  // -------------------------------------------------------------------------
  // Animation start → end values
  // -------------------------------------------------------------------------

  it("starts at the from-value and reaches the target exactly at duration", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useAnimatedNumber(v, 600),
      { initialProps: { v: 0 } },
    );

    act(() => {
      rerender({ v: 100 });
    });

    // t = 0  →  easeOutCubic(0) = 0  →  displayed = 0
    act(() => flushFrames(0));
    expect(result.current).toBeCloseTo(0, 1);

    // t = 0.5  →  easeOutCubic(0.5) = 0.875  →  displayed = 87.5
    act(() => flushFrames(300));
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(100);

    // t = 1  →  displayed must equal the target exactly
    act(() => flushFrames(600));
    expect(result.current).toBe(100);

    // No further frames should be scheduled after completion
    expect(pending.size).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Zero-to-value transition
  // -------------------------------------------------------------------------

  it("animates correctly from zero to a positive value", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useAnimatedNumber(v, 600),
      { initialProps: { v: 0 } },
    );

    act(() => {
      rerender({ v: 1_000 });
    });

    act(() => flushFrames(0));
    act(() => flushFrames(600));

    expect(result.current).toBe(1_000);
    expect(pending.size).toBe(0);
  });

  // -------------------------------------------------------------------------
  // prefers-reduced-motion bypass
  // -------------------------------------------------------------------------

  it("jumps to the target instantly when prefers-reduced-motion is set", () => {
    mockMatchMedia(true);

    const { result, rerender } = renderHook(
      ({ v }) => useAnimatedNumber(v, 600),
      { initialProps: { v: 0 } },
    );

    act(() => {
      rerender({ v: 100 });
    });

    // No rAF should have been scheduled
    expect(pending.size).toBe(0);
    // Value must equal the target without any frame flush
    expect(result.current).toBe(100);
  });

  // -------------------------------------------------------------------------
  // Mid-animation interruption
  // -------------------------------------------------------------------------

  it("re-targets smoothly when the value changes mid-animation", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useAnimatedNumber(v, 600),
      { initialProps: { v: 0 } },
    );

    // Start animating towards 100
    act(() => {
      rerender({ v: 100 });
    });
    act(() => flushFrames(0));
    act(() => flushFrames(300)); // mid-point (~87.5)

    const midValue = result.current;
    expect(midValue).toBeGreaterThan(0);

    // Change target mid-animation — should animate from mid-point to 200
    act(() => {
      rerender({ v: 200 });
    });
    act(() => flushFrames(300)); // new animation, t = 0
    act(() => flushFrames(900)); // new animation, t = 1

    expect(result.current).toBe(200);
  });
});
