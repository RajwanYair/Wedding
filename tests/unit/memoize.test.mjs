import { describe, it, expect, vi } from "vitest";
import { memoize } from "../../src/utils/memoize.js";

describe("memoize", () => {
  it("caches results for the same args", () => {
    const fn = vi.fn((x) => x * 2);
    const m = memoize(fn);
    expect(m(3)).toBe(6);
    expect(m(3)).toBe(6);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("recomputes for different args", () => {
    const fn = vi.fn((x) => x * 2);
    const m = memoize(fn);
    m(1);
    m(2);
    m(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("supports zero-arg functions", () => {
    const fn = vi.fn(() => 42);
    const m = memoize(fn);
    m();
    m();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("treats different primitives distinctly", () => {
    const fn = vi.fn((x) => x);
    const m = memoize(fn);
    m(1);
    m("1");
    m(true);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses JSON for object args", () => {
    const fn = vi.fn((o) => o.x);
    const m = memoize(fn);
    expect(m({ x: 1 })).toBe(1);
    expect(m({ x: 1 })).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("supports custom resolver", () => {
    const fn = vi.fn((u) => u.id);
    const m = memoize(fn, { resolver: (u) => String(u.id) });
    m({ id: 1, name: "a" });
    m({ id: 1, name: "b" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("clear empties the cache", () => {
    const fn = vi.fn((x) => x);
    const m = memoize(fn);
    m(1);
    m.clear();
    m(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("max evicts oldest entries", () => {
    const fn = vi.fn((x) => x);
    const m = memoize(fn, { max: 2 });
    m(1);
    m(2);
    m(3);
    expect(m.cache.has("n:1")).toBe(false);
    expect(m.cache.has("n:2")).toBe(true);
    expect(m.cache.has("n:3")).toBe(true);
  });

  it("hit refreshes recency under max", () => {
    const fn = vi.fn((x) => x);
    const m = memoize(fn, { max: 2 });
    m(1);
    m(2);
    m(1);
    m(3);
    expect(m.cache.has("n:2")).toBe(false);
    expect(m.cache.has("n:1")).toBe(true);
  });

  it("multi-arg keys separate by pipe", () => {
    const fn = vi.fn((a, b) => a + b);
    const m = memoize(fn);
    m(1, 2);
    m(1, 2);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("rejects non-function input", () => {
    expect(() => memoize(/** @type {any} */ (null))).toThrow();
  });

  it("exposes cache instance", () => {
    const m = memoize((x) => x);
    m(1);
    expect(m.cache).toBeInstanceOf(Map);
    expect(m.cache.size).toBe(1);
  });
});
