import { describe, it, expect, vi } from "vitest";
import { retry, computeDelay } from "../../src/utils/retry-backoff.js";

describe("retry-backoff", () => {
  it("returns immediately on success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    expect(await retry(fn)).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries until success", async () => {
    let count = 0;
    const fn = vi.fn().mockImplementation(() => {
      count += 1;
      if (count < 3) return Promise.reject(new Error("nope"));
      return Promise.resolve("done");
    });
    const sleep = vi.fn().mockResolvedValue(undefined);
    const out = await retry(fn, { retries: 5, sleep });
    expect(out).toBe("done");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("rejects after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(retry(fn, { retries: 2, sleep })).rejects.toThrow("fail");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects shouldRetry predicate", async () => {
    const err = new Error("fatal");
    const fn = vi.fn().mockRejectedValue(err);
    await expect(
      retry(fn, { retries: 5, shouldRetry: () => false }),
    ).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws when fn is not a function", async () => {
    await expect(retry(/** @type {any} */ (null))).rejects.toThrow();
  });

  it("computeDelay grows exponentially with no jitter", () => {
    expect(computeDelay(0, 100, 2, 1000, "none", () => 0.5)).toBe(100);
    expect(computeDelay(1, 100, 2, 1000, "none", () => 0.5)).toBe(200);
    expect(computeDelay(2, 100, 2, 1000, "none", () => 0.5)).toBe(400);
  });

  it("computeDelay caps at maxMs", () => {
    expect(computeDelay(10, 100, 2, 500, "none", () => 0.5)).toBe(500);
  });

  it("computeDelay full jitter scales with random", () => {
    expect(computeDelay(2, 100, 2, 1000, "full", () => 0)).toBe(0);
    expect(computeDelay(2, 100, 2, 1000, "full", () => 0.5)).toBe(200);
  });

  it("retry default options accept zero retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("once"));
    await expect(retry(fn, { retries: 0 })).rejects.toThrow("once");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retry passes deterministic delays to sleep", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("a"))
      .mockRejectedValueOnce(new Error("b"))
      .mockResolvedValue("ok");
    const sleep = vi.fn().mockResolvedValue(undefined);
    await retry(fn, {
      retries: 3,
      baseMs: 100,
      factor: 2,
      jitter: "none",
      sleep,
    });
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 200);
  });
});
