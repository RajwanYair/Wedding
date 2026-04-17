/**
 * tests/unit/lazy-loader.test.mjs — Sprint 173
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lazy, lazyResettable, debounce, throttle, once, memoize } from "../../src/utils/lazy-loader.js";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("lazy", () => {
  it("calls factory on first get", async () => {
    const factory = vi.fn().mockResolvedValue("result");
    const get = lazy(factory);
    await get();
    expect(factory).toHaveBeenCalledOnce();
  });

  it("returns cached value on subsequent calls", async () => {
    const factory = vi.fn().mockResolvedValue("result");
    const get = lazy(factory);
    await get();
    await get();
    expect(factory).toHaveBeenCalledOnce();
  });

  it("caches the promise not value — concurrent calls use same promise", async () => {
    let count = 0;
    const factory = () => new Promise((res) => { count++; res(count); });
    const get = lazy(factory);
    const [a, b] = await Promise.all([get(), get()]);
    expect(a).toBe(b);
    expect(count).toBe(1);
  });
});

describe("lazyResettable", () => {
  it("get works like lazy", async () => {
    const factory = vi.fn().mockResolvedValue("x");
    const ld = lazyResettable(factory);
    await ld.get();
    await ld.get();
    expect(factory).toHaveBeenCalledOnce();
  });

  it("reset causes factory to be called again", async () => {
    const factory = vi.fn().mockResolvedValue("x");
    const ld = lazyResettable(factory);
    await ld.get();
    ld.reset();
    await ld.get();
    expect(factory).toHaveBeenCalledTimes(2);
  });
});

describe("debounce", () => {
  it("does not call fn before wait time", () => {
    const fn = vi.fn();
    const d = debounce(fn, 200);
    d();
    expect(fn).not.toHaveBeenCalled();
  });

  it("calls fn after wait time", () => {
    const fn = vi.fn();
    const d = debounce(fn, 200);
    d();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("resets timer on repeated calls", () => {
    const fn = vi.fn();
    const d = debounce(fn, 200);
    d();
    vi.advanceTimersByTime(100);
    d();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("cancel prevents fn from being called", () => {
    const fn = vi.fn();
    const d = debounce(fn, 200);
    d();
    d.cancel();
    vi.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("throttle", () => {
  it("calls fn immediately on first invocation", () => {
    const fn = vi.fn();
    const t = throttle(fn, 200);
    t();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("does not call fn again within wait period", () => {
    const fn = vi.fn();
    const t = throttle(fn, 200);
    t();
    t();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("calls fn again after wait period", () => {
    const fn = vi.fn();
    const t = throttle(fn, 200);
    t();
    vi.advanceTimersByTime(200);
    t();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("once", () => {
  it("calls fn only on first invocation", () => {
    const fn = vi.fn().mockReturnValue("result");
    const o = once(fn);
    o();
    o();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("returns first result on subsequent calls", () => {
    let n = 0;
    const o = once(() => ++n);
    expect(o()).toBe(1);
    expect(o()).toBe(1);
  });
});

describe("memoize", () => {
  it("caches by key", () => {
    const fn = vi.fn((k) => k.toUpperCase());
    const m = memoize(fn);
    expect(m("hello")).toBe("HELLO");
    expect(m("hello")).toBe("HELLO");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("calls fn for each unique key", () => {
    const fn = vi.fn((k) => k);
    const m = memoize(fn);
    m("a");
    m("b");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
