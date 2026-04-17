/**
 * tests/unit/retry-with-backoff.test.mjs — Tests for retry-with-backoff.js (Sprint 63)
 */

import { describe, it, expect, vi } from "vitest";
import { exponentialDelay, retryWithBackoff, buildRetryOptions } from "../../src/utils/retry-with-backoff.js";

// Use baseDelayMs: 0 in async tests to avoid real timer waits.

describe("exponentialDelay", () => {
  it("attempt 1 equals baseMs with no jitter", () => {
    expect(exponentialDelay(1, 500, 30_000, false)).toBe(500);
  });

  it("attempt 2 doubles the base", () => {
    expect(exponentialDelay(2, 500, 30_000, false)).toBe(1000);
  });

  it("attempt 3 quadruples the base", () => {
    expect(exponentialDelay(3, 500, 30_000, false)).toBe(2000);
  });

  it("caps at maxMs", () => {
    expect(exponentialDelay(20, 500, 1_000, false)).toBe(1_000);
  });

  it("with jitter returns a value within ±25% of base", () => {
    const raw = 500;
    for (let i = 0; i < 50; i++) {
      const d = exponentialDelay(1, raw, 30_000, true);
      expect(d).toBeGreaterThanOrEqual(raw * 0.75 - 1);
      expect(d).toBeLessThanOrEqual(raw * 1.25 + 1);
    }
  });
});

describe("retryWithBackoff — success path", () => {
  it("resolves immediately when fn succeeds on first try", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 0, jitter: false })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resolves on a later attempt after initial failures", async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(() => {
      calls++;
      if (calls < 3) return Promise.reject(new Error("fail"));
      return Promise.resolve("recovered");
    });
    await expect(retryWithBackoff(fn, { maxRetries: 4, baseDelayMs: 0, jitter: false })).resolves.toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("retryWithBackoff — failure path", () => {
  it("throws after exhausting all retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("bad"));
    await expect(retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 0, jitter: false })).rejects.toThrow("bad");
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("stops retrying when shouldRetry returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("permanent"));
    const shouldRetry = vi.fn().mockReturnValue(false);
    await expect(retryWithBackoff(fn, { maxRetries: 5, baseDelayMs: 0, jitter: false, shouldRetry })).rejects.toThrow("permanent");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });

  it("passes attempt number to shouldRetry", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("x"));
    const attempts = [];
    const shouldRetry = (err, attempt) => { attempts.push(attempt); return attempt < 2; };
    await expect(retryWithBackoff(fn, { maxRetries: 5, baseDelayMs: 0, jitter: false, shouldRetry })).rejects.toThrow("x");
    expect(attempts).toStrictEqual([1, 2]);
    expect(fn).toHaveBeenCalledTimes(2); // 1 initial + 1 retry (returns false at attempt 2, so no more)
  });
});

describe("buildRetryOptions", () => {
  it("returns defaults when no overrides", () => {
    const opts = buildRetryOptions();
    expect(opts.maxRetries).toBe(3);
    expect(opts.baseDelayMs).toBe(500);
    expect(opts.maxDelayMs).toBe(30_000);
    expect(opts.jitter).toBe(true);
    expect(typeof opts.shouldRetry).toBe("function");
  });

  it("overrides merge correctly", () => {
    const opts = buildRetryOptions({ maxRetries: 10, baseDelayMs: 200 });
    expect(opts.maxRetries).toBe(10);
    expect(opts.baseDelayMs).toBe(200);
    expect(opts.maxDelayMs).toBe(30_000);
  });
});
