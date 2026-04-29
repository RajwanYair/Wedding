/**
 * tests/unit/observability.test.mjs — S353: services/observability.js helpers
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────

const _store = new Map();

vi.mock("../../src/core/store.js", () => ({
  storeGet: (k) => _store.get(k) ?? null,
  storeSet: vi.fn((k, v) => _store.set(k, v)),
  storeUpsert: vi.fn((k, record) => {
    const arr = _store.get(k) ?? [];
    arr.push(record);
    _store.set(k, arr);
  }),
}));

vi.mock("../../src/core/config.js", () => ({
  APP_VERSION: "13.16.0",
}));

vi.mock("../../src/services/compliance.js", () => ({
  logError: vi.fn(),
}));

import {
  reportError,
  setUser,
  configureTransport,
  captureError,
  getErrors,
  clearErrors,
  getErrorSummary,
  getRecentErrorCount,
  parseDsn,
  buildErrorPayload,
  scrubPii,
  addBreadcrumb,
  getBreadcrumbs,
  _resetForTests,
} from "../../src/services/observability.js";

beforeEach(() => {
  _store.clear();
  vi.clearAllMocks();
  _resetForTests();
});

// ── reportError ───────────────────────────────────────────────────────────

describe("reportError", () => {
  it("does not throw for Error objects", () => {
    expect(() => reportError(new Error("test error"))).not.toThrow();
  });

  it("does not throw for string errors", () => {
    expect(() => reportError("some string error")).not.toThrow();
  });

  it("does not throw for unknown types", () => {
    expect(() => reportError({ weirdObject: true })).not.toThrow();
  });

  it("calls configured transport", () => {
    const transport = vi.fn();
    configureTransport(transport);
    reportError(new Error("boom"));
    expect(transport).toHaveBeenCalledOnce();
  });
});

// ── setUser ────────────────────────────────────────────────────────────────

describe("setUser", () => {
  it("accepts valid user object", () => {
    expect(() => setUser({ id: "user-123" })).not.toThrow();
  });

  it("accepts null to clear user", () => {
    setUser({ id: "user-123" });
    expect(() => setUser(null)).not.toThrow();
  });

  it("throws for invalid user object", () => {
    expect(() => setUser(/** @type {any} */ ({ name: "no id" }))).toThrow(TypeError);
  });
});

// ── configureTransport ────────────────────────────────────────────────────

describe("configureTransport", () => {
  it("accepts a function", () => {
    expect(() => configureTransport(() => {})).not.toThrow();
  });

  it("throws for non-function", () => {
    expect(() => configureTransport(/** @type {any} */ ("not a function"))).toThrow(TypeError);
  });
});

// ── captureError ──────────────────────────────────────────────────────────

describe("captureError", () => {
  it("captures and stores an error", () => {
    captureError(new Error("Oops"));
    const errors = getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("Oops");
  });

  it("includes context in stored record", () => {
    captureError(new Error("ctx test"), { component: "table-section" });
    const errors = getErrors();
    expect(errors[0].context.component).toBe("table-section");
  });

  it("stores string errors", () => {
    captureError("string error");
    expect(getErrors()[0].message).toBe("string error");
  });

  it("returns the stored error record", () => {
    const record = captureError(new Error("returned"));
    expect(record).toHaveProperty("id");
    expect(record).toHaveProperty("ts");
    expect(record.message).toBe("returned");
  });
});

// ── getErrors ──────────────────────────────────────────────────────────────

describe("getErrors", () => {
  it("returns empty array when no errors", () => {
    expect(getErrors()).toHaveLength(0);
  });

  it("filters by type", () => {
    captureError(new TypeError("type error"));
    captureError(new Error("base error"));
    const typeErrors = getErrors({ type: "TypeError" });
    expect(typeErrors).toHaveLength(1);
    expect(typeErrors[0].type).toBe("TypeError");
  });

  it("filters by since timestamp", () => {
    const before = Date.now();
    captureError(new Error("recent"));
    const errors = getErrors({ since: before });
    expect(errors).toHaveLength(1);
  });
});

// ── clearErrors ────────────────────────────────────────────────────────────

describe("clearErrors", () => {
  it("empties the error store", () => {
    captureError(new Error("X"));
    clearErrors();
    expect(getErrors()).toHaveLength(0);
  });
});

// ── getErrorSummary ────────────────────────────────────────────────────────

describe("getErrorSummary", () => {
  it("returns zeros for empty store", () => {
    const s = getErrorSummary();
    expect(s.total).toBe(0);
    expect(s.byType).toEqual({});
  });

  it("groups errors by type", () => {
    captureError(new TypeError("t1"));
    captureError(new TypeError("t2"));
    captureError(new Error("e1"));
    const s = getErrorSummary();
    expect(s.total).toBe(3);
    expect(s.byType.TypeError).toBe(2);
    expect(s.byType.Error).toBe(1);
  });

  it("includes latest error", () => {
    captureError(new Error("latest"));
    const s = getErrorSummary();
    expect(s.latest?.message).toBe("latest");
  });
});

// ── getRecentErrorCount ───────────────────────────────────────────────────

describe("getRecentErrorCount", () => {
  it("returns 0 when no errors", () => {
    expect(getRecentErrorCount()).toBe(0);
  });

  it("counts recent errors", () => {
    captureError(new Error("a"));
    captureError(new Error("b"));
    expect(getRecentErrorCount(Date.now() - 10000)).toBe(2);
  });
});

// ── parseDsn ───────────────────────────────────────────────────────────────

describe("parseDsn", () => {
  it("returns null for empty input", () => {
    expect(parseDsn("")).toBeNull();
    expect(parseDsn(null)).toBeNull();
  });

  it("parses a valid Sentry DSN", () => {
    const result = parseDsn("https://mykey@o123.ingest.sentry.io/456789");
    expect(result).not.toBeNull();
    expect(result?.key).toBe("mykey");
    expect(result?.projectId).toBe("456789");
  });

  it("returns null for invalid URL", () => {
    expect(parseDsn("not-a-url")).toBeNull();
  });
});

// ── buildErrorPayload ──────────────────────────────────────────────────────

describe("buildErrorPayload", () => {
  it("builds a payload with required fields", () => {
    const payload = buildErrorPayload(new Error("test"));
    expect(payload).toHaveProperty("event_id");
    expect(payload).toHaveProperty("timestamp");
    expect(payload).toHaveProperty("exception");
    expect(payload.exception.values[0].value).toBe("test");
  });

  it("includes custom tags", () => {
    const payload = buildErrorPayload(new Error("x"), { tags: { env: "prod" } });
    expect(payload.tags.env).toBe("prod");
  });
});

// ── scrubPii ───────────────────────────────────────────────────────────────

describe("scrubPii", () => {
  it("redacts email addresses", () => {
    const result = scrubPii("Contact: user@example.com");
    expect(result).toContain("[email]");
    expect(result).not.toContain("user@example.com");
  });

  it("redacts Israeli phone numbers", () => {
    const result = scrubPii("Phone: 054-123-4567");
    expect(result).toContain("[phone-");
    expect(result).not.toContain("054-123-4567");
  });

  it("redacts bearer tokens", () => {
    const result = scrubPii("Auth: Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature");
    expect(result).toContain("[token]");
  });

  it("returns non-string input unchanged", () => {
    expect(scrubPii(/** @type {any} */ (42))).toBe(42);
    expect(scrubPii(/** @type {any} */ (null))).toBeNull();
  });

  it("leaves safe strings untouched", () => {
    const safe = "Hello, this is a safe string";
    expect(scrubPii(safe)).toBe(safe);
  });
});

// ── addBreadcrumb / getBreadcrumbs ────────────────────────────────────────

describe("addBreadcrumb + getBreadcrumbs", () => {
  it("adds a breadcrumb", () => {
    addBreadcrumb({ category: "nav", message: "to guests" });
    expect(getBreadcrumbs()).toHaveLength(1);
  });

  it("getBreadcrumbs returns empty when no breadcrumbs", () => {
    expect(getBreadcrumbs()).toHaveLength(0);
  });

  it("adds multiple breadcrumbs", () => {
    addBreadcrumb({ category: "nav", message: "a" });
    addBreadcrumb({ category: "nav", message: "b" });
    expect(getBreadcrumbs()).toHaveLength(2);
  });
});
