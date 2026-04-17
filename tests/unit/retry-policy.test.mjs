/**
 * tests/unit/retry-policy.test.mjs — Sprint 172
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { withRetry, createRetryPolicy, calcDelay } from "../../src/utils/retry-policy.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("calcDelay", () => {
  it("doubles delay with each attempt (no jitter)", () => {
    const d1 = calcDelay(1, { baseDelayMs: 100, maxDelayMs: 5000, jitter: false });
    const d2 = calcDelay(2, { baseDelayMs: 100, maxDelayMs: 5000, jitter: false });
    expect(d2).toBe(d1 * 2);
  });

  it("caps at maxDelayMs", () => {
    const d = calcDelay(10, { baseDelayMs: 100, maxDelayMs: 500, jitter: false });
    expect(d).toBe(500);
  });

  it("applies jitter when enabled", () => {
    const delays = Array.from({ length: 10 }, () =>
      calcDelay(1, { baseDelayMs: 200, maxDelayMs: 5000, jitter: true }),
    );
    const unique = new Set(delays);
    // With random jitter, most values should differ
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe("withRetry — success", () => {
  it("resolves on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("resolves on second attempt after failure", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");
    await expect(withRetry(fn, { maxAttempts: 3, jitter: false })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("withRetry — failure", () => {
  it("retries after delay", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");
    await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 5, jitter: false })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after maxAttempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 5, jitter: false })).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("retryIf predicate", () => {
  it("aborts early when retryIf returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("not retryable"));
    const retryIf = vi.fn().mockReturnValue(false);
    await expect(withRetry(fn, { maxAttempts: 3, retryIf })).rejects.toThrow();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("retries when retryIf returns true", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("retry"))
      .mockResolvedValue("ok");
    const retryIf = vi.fn().mockReturnValue(true);
    await expect(withRetry(fn, { maxAttempts: 2, retryIf })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("onRetry hook", () => {
  it("calls onRetry with error, attempt number, and delay", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("nope"))
      .mockResolvedValue("ok");
    const onRetry = vi.fn();
    await withRetry(fn, { maxAttempts: 2, jitter: false, onRetry });
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onRetry.mock.calls[0][1]).toBe(1); // attempt 1
  });
});

describe("createRetryPolicy", () => {
  it("creates a bound retry function", async () => {
    const policy = createRetryPolicy({ maxAttempts: 2, jitter: false });
    const fn = vi.fn().mockResolvedValue("result");
    await expect(policy(fn)).resolves.toBe("result");
  });

  it("overrides can be merged at call time", async () => {
    const policy = createRetryPolicy({ maxAttempts: 5, jitter: false });
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    await expect(policy(fn, { maxAttempts: 1 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledOnce();
  });
});
