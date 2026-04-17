/**
 * tests/unit/async-helpers.test.mjs — Sprint 183
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withTimeout, allSettledWith, serial, concurrent, delay, retryAsync } from "../../src/utils/async-helpers.js";

describe("withTimeout", () => {
  it("resolves when promise completes before timeout", async () => {
    const result = await withTimeout(Promise.resolve(42), 1000);
    expect(result).toBe(42);
  });

  it("rejects with timeout error when promise is too slow", async () => {
    const slow = new Promise((r) => setTimeout(r, 500));
    await expect(withTimeout(slow, 10)).rejects.toThrow("timeout");
  });

  it("propagates rejection from the wrapped promise", async () => {
    await expect(withTimeout(Promise.reject(new Error("fail")), 1000)).rejects.toThrow("fail");
  });
});

describe("allSettledWith", () => {
  it("returns value for fulfilled promises", async () => {
    const results = await allSettledWith([Promise.resolve(1), Promise.resolve(2)]);
    expect(results[0]).toEqual({ value: 1 });
    expect(results[1]).toEqual({ value: 2 });
  });

  it("returns error for rejected promises", async () => {
    const err = new Error("oops");
    const results = await allSettledWith([Promise.reject(err)]);
    expect(results[0]).toEqual({ error: err });
  });

  it("handles mixed settled/rejected", async () => {
    const results = await allSettledWith([Promise.resolve("ok"), Promise.reject("bad")]);
    expect(results).toHaveLength(2);
    expect("value" in results[0]).toBe(true);
    expect("error" in results[1]).toBe(true);
  });
});

describe("serial", () => {
  it("runs functions in order", async () => {
    const order = [];
    const fns = [1, 2, 3].map((n) => async () => { order.push(n); return n; });
    const results = await serial(fns);
    expect(results).toEqual([1, 2, 3]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("returns empty array for empty input", async () => {
    expect(await serial([])).toEqual([]);
  });
});

describe("concurrent", () => {
  it("runs up to limit concurrently and returns all results", async () => {
    const fns = [1, 2, 3, 4, 5].map((n) => async () => n * 2);
    const results = await concurrent(fns, 2);
    expect(results.sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10]);
  });

  it("returns empty for empty input", async () => {
    expect(await concurrent([], 2)).toEqual([]);
  });

  it("default limit of 4 works", async () => {
    const fns = Array.from({ length: 8 }, (_, i) => async () => i);
    const results = await concurrent(fns);
    expect(results).toHaveLength(8);
  });
});

describe("delay", () => {
  it("resolves after approximately ms milliseconds", async () => {
    const start = Date.now();
    await delay(20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });
});

describe("retryAsync", () => {
  it("returns immediately on success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    expect(await retryAsync(fn)).toBe("ok");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("retries on failure and eventually resolves", async () => {
    let attempt = 0;
    const fn = vi.fn().mockImplementation(async () => {
      if (attempt++ < 2) throw new Error("fail");
      return "done";
    });
    expect(await retryAsync(fn, { retries: 3 })).toBe("done");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always-fail"));
    await expect(retryAsync(fn, { retries: 2 })).rejects.toThrow("always-fail");
    expect(fn).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });
});
