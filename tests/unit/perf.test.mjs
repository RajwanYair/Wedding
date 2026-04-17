/**
 * tests/unit/perf.test.mjs — Unit tests for performance utilities (Sprint 38)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  debounce,
  throttle,
  memoize,
  memoizeAsync,
  measureAsync,
  once,
  createBatcher,
} from "../../src/utils/perf.js";

// ── debounce ──────────────────────────────────────────────────────────────

describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("delays execution by the specified delay", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d("a");
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("only calls fn once for multiple rapid calls", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d("a"); d("b"); d("c");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith("c");
  });

  it("cancel() prevents fn from being called", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d("x");
    d.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });

  it("flush() invokes fn immediately if pending", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d("x");
    d.flush();
    expect(fn).toHaveBeenCalledWith("x");
  });

  it("flush() is a no-op when nothing is pending", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d.flush();
    expect(fn).not.toHaveBeenCalled();
  });
});

// ── throttle ──────────────────────────────────────────────────────────────

describe("throttle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls fn immediately on first invocation", () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);
    t("x");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("drops calls within delay window", () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);
    t("a"); t("b"); t("c");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("allows a second call after delay passes", () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);
    t("a");
    vi.advanceTimersByTime(101);
    t("b");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ── memoize ───────────────────────────────────────────────────────────────

describe("memoize", () => {
  it("caches and returns the same result for identical args", () => {
    const fn = vi.fn((x) => x * 2);
    const m = memoize(fn);
    expect(m(4)).toBe(8);
    expect(m(4)).toBe(8);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("recomputes for different args", () => {
    const fn = vi.fn((x) => x * 2);
    const m = memoize(fn);
    m(1); m(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("clear() purges the cache", () => {
    const fn = vi.fn((x) => x);
    const m = memoize(fn);
    m("a");
    m.clear();
    m("a");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exposes .cache Map", () => {
    const m = memoize((x) => x);
    m("key");
    expect(m.cache.size).toBe(1);
  });

  it("accepts custom keyFn", () => {
    const fn = vi.fn((obj) => obj.x);
    const m = memoize(fn, (o) => String(o.x));
    m({ x: 1 }); m({ x: 1 });
    expect(fn).toHaveBeenCalledOnce();
  });
});

// ── memoizeAsync ──────────────────────────────────────────────────────────

describe("memoizeAsync", () => {
  it("caches resolved value on subsequent calls", async () => {
    const fn = vi.fn(async (x) => x * 2);
    const m = memoizeAsync(fn);
    await m(3); await m(3);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("does not cache rejected promises", async () => {
    let fail = true;
    const fn = vi.fn(async () => {
      if (fail) { fail = false; throw new Error("oops"); }
      return 99;
    });
    const m = memoizeAsync(fn);
    await expect(m()).rejects.toThrow();
    await expect(m()).resolves.toBe(99);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ── measureAsync ──────────────────────────────────────────────────────────

describe("measureAsync", () => {
  it("resolves with result and durationMs >= 0", async () => {
    const { result, durationMs, label } = await measureAsync("test", () => 42);
    expect(result).toBe(42);
    expect(durationMs).toBeGreaterThanOrEqual(0);
    expect(label).toBe("test");
  });

  it("works with async functions", async () => {
    const { result } = await measureAsync("async", async () => {
      return "done";
    });
    expect(result).toBe("done");
  });
});

// ── once ─────────────────────────────────────────────────────────────────

describe("once", () => {
  it("calls fn exactly once", () => {
    const fn = vi.fn(() => 7);
    const o = once(fn);
    o(); o(); o();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("returns the same value on subsequent calls", () => {
    const o = once(() => Math.random());
    const first = o();
    expect(o()).toBe(first);
  });
});

// ── createBatcher ─────────────────────────────────────────────────────────

describe("createBatcher", () => {
  it("batches multiple pushes into one flush call", async () => {
    const flush = vi.fn();
    const push = createBatcher(flush);
    push(1); push(2); push(3);
    // Wait for microtask queue
    await Promise.resolve();
    expect(flush).toHaveBeenCalledOnce();
    expect(flush).toHaveBeenCalledWith([1, 2, 3]);
  });

  it("sends separate batches across microtask turns", async () => {
    const flush = vi.fn();
    const push = createBatcher(flush);
    push("a");
    await Promise.resolve();
    push("b");
    await Promise.resolve();
    expect(flush).toHaveBeenCalledTimes(2);
  });
});
