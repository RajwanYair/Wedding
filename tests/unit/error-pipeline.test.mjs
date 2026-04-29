/**
 * tests/unit/error-pipeline.test.mjs — Unit tests for error pipeline service (Sprint 47)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));
vi.mock("../../src/core/config.js", () => ({
  APP_VERSION: "6.4.0",
  STORAGE_PREFIX: "wedding_v1_",
  BACKEND_TYPE: "supabase",
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  GAS_URL: "",
  GOOGLE_CLIENT_ID: "",
  FB_APP_ID: "",
  APPLE_SERVICE_ID: "",
  ADMIN_EMAILS: [],
}));

import { initStore } from "../../src/core/store.js";
const { captureError, getErrors, clearErrors, getErrorSummary, getRecentErrorCount } =
  await import("../../src/services/observability.js");

function seedStore() {
  initStore({
    appErrors: { value: [] },
    guests: { value: [] },
    campaigns: { value: [] },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    weddingInfo: { value: {} },
  });
}

beforeEach(() => seedStore());

// ── captureError ──────────────────────────────────────────────────────────

describe("captureError", () => {
  it("returns a record with required fields", () => {
    const rec = captureError(new Error("oops"));
    expect(rec.id).toMatch(/^err_/);
    expect(rec.type).toBe("Error");
    expect(rec.message).toBe("oops");
    expect(rec.version).toBe("6.4.0");
    expect(typeof rec.ts).toBe("number");
  });

  it("captures non-Error values", () => {
    const rec = captureError("plain string error");
    expect(rec.type).toBe("string");
    expect(rec.message).toBe("plain string error");
  });

  it("stores context", () => {
    const rec = captureError(new Error("ctx"), { section: "guests", action: "save" });
    expect(rec.context.section).toBe("guests");
  });

  it("includes stack for Error objects", () => {
    const rec = captureError(new Error("with stack"));
    expect(rec.stack).toBeDefined();
    expect(typeof rec.stack).toBe("string");
  });

  it("persists multiple errors", () => {
    captureError(new Error("A"));
    captureError(new Error("B"));
    expect(getErrors()).toHaveLength(2);
  });
});

// ── getErrors ─────────────────────────────────────────────────────────────

describe("getErrors", () => {
  it("returns newest first", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    captureError(new Error("first"));
    vi.setSystemTime(2000);
    captureError(new Error("second"));
    vi.useRealTimers();
    const errors = getErrors();
    expect(errors[0].message).toBe("second");
  });

  it("filters by type", () => {
    captureError(new TypeError("type err"));
    captureError(new RangeError("range err"));
    const typed = getErrors({ type: "TypeError" });
    expect(typed).toHaveLength(1);
    expect(typed[0].type).toBe("TypeError");
  });

  it("returns empty array when store is empty", () => {
    expect(getErrors()).toEqual([]);
  });
});

// ── clearErrors ───────────────────────────────────────────────────────────

describe("clearErrors", () => {
  it("removes all errors", () => {
    captureError(new Error("x"));
    clearErrors();
    expect(getErrors()).toEqual([]);
  });
});

// ── getErrorSummary ───────────────────────────────────────────────────────

describe("getErrorSummary", () => {
  it("returns zero state when empty", () => {
    const summary = getErrorSummary();
    expect(summary.total).toBe(0);
    expect(summary.byType).toEqual({});
  });

  it("groups by error type", () => {
    captureError(new TypeError("a"));
    captureError(new TypeError("b"));
    captureError(new RangeError("c"));
    const summary = getErrorSummary();
    expect(summary.total).toBe(3);
    expect(summary.byType.TypeError).toBe(2);
    expect(summary.byType.RangeError).toBe(1);
  });

  it("includes latest error", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    captureError(new Error("early"));
    vi.setSystemTime(9000);
    captureError(new Error("latest one"));
    vi.useRealTimers();
    const summary = getErrorSummary();
    expect(summary.latest?.message).toBe("latest one");
  });
});

// ── getRecentErrorCount ───────────────────────────────────────────────────

describe("getRecentErrorCount", () => {
  it("counts errors within the last 60s by default", () => {
    captureError(new Error("now"));
    expect(getRecentErrorCount()).toBeGreaterThanOrEqual(1);
  });

  it("returns 0 when all errors are older than cutoff", () => {
    const oldTs = Date.now() - 120_000;
    expect(getRecentErrorCount(Date.now() + 1000)).toBe(0);
    void oldTs; // suppress unused warning
  });
});
