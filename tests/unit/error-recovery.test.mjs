import { describe, it, expect } from "vitest";
import {
  ERROR_CLASSES,
  RETRY_STRATEGIES,
  classifyError,
  isNetworkError,
  isAuthError,
  isQuotaError,
  isNotFoundError,
  isRateLimitError,
  isTimeoutError,
  isRetryable,
  getRetryDelay,
  buildErrorReport,
  withTimeout,
  withFallback,
} from "../../src/utils/error-recovery.js";

// ── Constants ─────────────────────────────────────────────────────────────

describe("ERROR_CLASSES", () => {
  it("is frozen", () => expect(Object.isFrozen(ERROR_CLASSES)).toBe(true));
  it("has expected keys", () => {
    expect(ERROR_CLASSES.NETWORK).toBe("network");
    expect(ERROR_CLASSES.AUTH).toBe("auth");
    expect(ERROR_CLASSES.QUOTA).toBe("quota");
    expect(ERROR_CLASSES.NOT_FOUND).toBe("not_found");
    expect(ERROR_CLASSES.UNKNOWN).toBe("unknown");
  });
});

describe("RETRY_STRATEGIES", () => {
  it("is frozen", () => expect(Object.isFrozen(RETRY_STRATEGIES)).toBe(true));
  it("has NONE, FIXED, EXPONENTIAL, JITTER", () => {
    expect(RETRY_STRATEGIES.NONE).toBe("none");
    expect(RETRY_STRATEGIES.EXPONENTIAL).toBe("exponential");
  });
});

// ── classifyError ─────────────────────────────────────────────────────────

describe("classifyError()", () => {
  it("returns UNKNOWN for null", () => expect(classifyError(null)).toBe(ERROR_CLASSES.UNKNOWN));
  it("classifies network error", () => {
    expect(classifyError(new Error("Network request failed"))).toBe(ERROR_CLASSES.NETWORK);
  });
  it("classifies 401 as auth", () => {
    expect(classifyError({ status: 401, message: "Unauthorized" })).toBe(ERROR_CLASSES.AUTH);
  });
  it("classifies 404 as not_found", () => {
    expect(classifyError({ status: 404, message: "Not found" })).toBe(ERROR_CLASSES.NOT_FOUND);
  });
  it("classifies 429 as rate_limit", () => {
    expect(classifyError({ status: 429, message: "Too many requests" })).toBe(ERROR_CLASSES.RATE_LIMIT);
  });
  it("classifies quota error", () => {
    const e = new Error("QuotaExceeded");
    e.name = "QuotaExceededError";
    expect(classifyError(e)).toBe(ERROR_CLASSES.QUOTA);
  });
  it("classifies 500 as server", () => {
    expect(classifyError({ status: 500, message: "Internal server error" })).toBe(ERROR_CLASSES.SERVER);
  });
  it("classifies timeout", () => {
    const e = new Error("timed out");
    expect(classifyError(e)).toBe(ERROR_CLASSES.TIMEOUT);
  });
  it("classifies AbortError as timeout", () => {
    const e = new Error("aborted");
    e.name = "AbortError";
    expect(classifyError(e)).toBe(ERROR_CLASSES.TIMEOUT);
  });
});

// ── isNetworkError ────────────────────────────────────────────────────────

describe("isNetworkError()", () => {
  it("returns true for 'Failed to fetch' message", () => {
    expect(isNetworkError(new Error("Failed to fetch"))).toBe(true);
  });
  it("returns true for 'offline' message", () => {
    expect(isNetworkError(new Error("You are offline"))).toBe(true);
  });
  it("returns false for null", () => expect(isNetworkError(null)).toBe(false));
  it("returns false for auth error", () => {
    expect(isNetworkError({ status: 401, message: "Unauthorized" })).toBe(false);
  });
});

// ── isAuthError ───────────────────────────────────────────────────────────

describe("isAuthError()", () => {
  it("returns true for status 401", () => expect(isAuthError({ status: 401, message: "" })).toBe(true));
  it("returns true for status 403", () => expect(isAuthError({ status: 403, message: "" })).toBe(true));
  it("returns true for 'not authenticated' message", () => {
    expect(isAuthError(new Error("Not authenticated"))).toBe(true);
  });
  it("returns false for null", () => expect(isAuthError(null)).toBe(false));
});

// ── isQuotaError ──────────────────────────────────────────────────────────

describe("isQuotaError()", () => {
  it("returns true for QuotaExceededError name", () => {
    const e = new Error("quota");
    e.name = "QuotaExceededError";
    expect(isQuotaError(e)).toBe(true);
  });
  it("returns true for 'quota' message", () => {
    expect(isQuotaError(new Error("Storage quota exceeded"))).toBe(true);
  });
  it("returns false for null", () => expect(isQuotaError(null)).toBe(false));
});

// ── isNotFoundError ───────────────────────────────────────────────────────

describe("isNotFoundError()", () => {
  it("returns true for status 404", () => expect(isNotFoundError({ status: 404, message: "" })).toBe(true));
  it("returns true for 'not found' message", () => {
    expect(isNotFoundError(new Error("Resource not found"))).toBe(true);
  });
  it("returns false for null", () => expect(isNotFoundError(null)).toBe(false));
});

// ── isRateLimitError ──────────────────────────────────────────────────────

describe("isRateLimitError()", () => {
  it("returns true for status 429", () => expect(isRateLimitError({ status: 429, message: "" })).toBe(true));
  it("returns true for 'rate limit' message", () => {
    expect(isRateLimitError(new Error("Rate limit exceeded"))).toBe(true);
  });
  it("returns false for null", () => expect(isRateLimitError(null)).toBe(false));
});

// ── isTimeoutError ────────────────────────────────────────────────────────

describe("isTimeoutError()", () => {
  it("returns true for AbortError", () => {
    const e = new Error("aborted");
    e.name = "AbortError";
    expect(isTimeoutError(e)).toBe(true);
  });
  it("returns true for timeout message", () => {
    expect(isTimeoutError(new Error("Request timeout"))).toBe(true);
  });
  it("returns false for null", () => expect(isTimeoutError(null)).toBe(false));
});

// ── isRetryable ───────────────────────────────────────────────────────────

describe("isRetryable()", () => {
  it("network is retryable", () => expect(isRetryable(ERROR_CLASSES.NETWORK)).toBe(true));
  it("timeout is retryable", () => expect(isRetryable(ERROR_CLASSES.TIMEOUT)).toBe(true));
  it("rate_limit is retryable", () => expect(isRetryable(ERROR_CLASSES.RATE_LIMIT)).toBe(true));
  it("server is retryable", () => expect(isRetryable(ERROR_CLASSES.SERVER)).toBe(true));
  it("auth is NOT retryable", () => expect(isRetryable(ERROR_CLASSES.AUTH)).toBe(false));
  it("not_found is NOT retryable", () => expect(isRetryable(ERROR_CLASSES.NOT_FOUND)).toBe(false));
  it("unknown is NOT retryable", () => expect(isRetryable(ERROR_CLASSES.UNKNOWN)).toBe(false));
});

// ── getRetryDelay ─────────────────────────────────────────────────────────

describe("getRetryDelay()", () => {
  it("returns 0 for attempt 0", () => expect(getRetryDelay(0)).toBe(0));
  it("returns baseMs for attempt 1 with exponential", () => {
    expect(getRetryDelay(1, { strategy: RETRY_STRATEGIES.EXPONENTIAL, baseMs: 500 })).toBe(500);
  });
  it("doubles each attempt with exponential", () => {
    const d1 = getRetryDelay(1, { strategy: RETRY_STRATEGIES.EXPONENTIAL, baseMs: 100 });
    const d2 = getRetryDelay(2, { strategy: RETRY_STRATEGIES.EXPONENTIAL, baseMs: 100 });
    expect(d2).toBe(d1 * 2);
  });
  it("caps at maxMs", () => {
    const delay = getRetryDelay(20, { strategy: RETRY_STRATEGIES.EXPONENTIAL, baseMs: 500, maxMs: 5000 });
    expect(delay).toBe(5000);
  });
  it("returns fixed baseMs for FIXED strategy", () => {
    expect(getRetryDelay(5, { strategy: RETRY_STRATEGIES.FIXED, baseMs: 250 })).toBe(250);
  });
  it("returns 0 for NONE strategy", () => {
    expect(getRetryDelay(3, { strategy: RETRY_STRATEGIES.NONE })).toBe(0);
  });
});

// ── buildErrorReport ──────────────────────────────────────────────────────

describe("buildErrorReport()", () => {
  it("returns report shape", () => {
    const report = buildErrorReport(new Error("fetch failed"), { context: "guests", attempt: 2 });
    expect(report.message).toBe("fetch failed");
    expect(report.errorClass).toBe(ERROR_CLASSES.NETWORK);
    expect(report.context).toBe("guests");
    expect(report.attempt).toBe(2);
    expect(report.retryable).toBe(true);
    expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("includes stack when available", () => {
    const e = new Error("oops");
    const report = buildErrorReport(e);
    expect(report.stack).toBeDefined();
  });

  it("includes userId when provided", () => {
    const report = buildErrorReport("some error", { userId: "usr123" });
    expect(report.userId).toBe("usr123");
  });

  it("handles string error", () => {
    const report = buildErrorReport("Simple string error");
    expect(report.message).toBe("Simple string error");
  });
});

// ── withTimeout ───────────────────────────────────────────────────────────

describe("withTimeout()", () => {
  it("resolves when promise completes before timeout", async () => {
    const result = await withTimeout(Promise.resolve(42), 1000);
    expect(result).toBe(42);
  });

  it("rejects when promise exceeds timeout", async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 500));
    await expect(withTimeout(slow, 10)).rejects.toThrow("timed out");
  });
});

// ── withFallback ──────────────────────────────────────────────────────────

describe("withFallback()", () => {
  it("returns fn result on success", async () => {
    expect(await withFallback(() => 7, 0)).toBe(7);
  });

  it("returns fallbackValue on error", async () => {
    const result = await withFallback(() => { throw new Error("boom"); }, "default");
    expect(result).toBe("default");
  });

  it("works with async fns", async () => {
    const result = await withFallback(async () => { throw new Error("async error"); }, null);
    expect(result).toBeNull();
  });
});
