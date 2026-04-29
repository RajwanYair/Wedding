/**
 * tests/unit/compliance.test.mjs — S360: services/compliance.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("../../src/core/constants.js", () => ({
  STORE_DATA_CLASS: {
    guests: "GUEST_PRIVATE",
    tables: "EVENT_INTERNAL",
    vendors: "VENDOR_INTERNAL",
  },
  DATA_CLASS: {
    ADMIN_SENSITIVE: "ADMIN_SENSITIVE",
    GUEST_PRIVATE: "GUEST_PRIVATE",
    EVENT_INTERNAL: "EVENT_INTERNAL",
  },
  STORAGE_KEYS: {
    SUPABASE_SESSION: "supabase_session",
    ERROR_SESSION_ID: "error_session_id",
  },
}));

vi.mock("../../src/core/config.js", () => ({
  APP_VERSION: "13.17.0",
  STORAGE_PREFIX: "wedding_v1_",
  MAX_RETRIES: 3,
  BACKOFF_BASE_MS: 100,
}));

vi.mock("../../src/core/state.js", () => ({
  getActiveEventId: vi.fn(() => "default"),
}));

vi.mock("../../src/services/security.js", () => ({
  setSecure: vi.fn(async () => {}),
  getSecure: vi.fn(async () => null),
}));

vi.mock("../../src/core/app-config.js", () => ({
  getBackendTypeConfig: vi.fn(() => "local"),
  getSupabaseAnonKey: vi.fn(() => null),
  getSupabaseUrl: vi.fn(() => null),
}));

vi.mock("../../src/services/observability.js", () => ({
  reportError: vi.fn(),
}));

vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: vi.fn(() => null),
  readSessionStorage: vi.fn(() => ""),
  writeSessionStorage: vi.fn(),
}));

import {
  getFieldClassification,
  isPII,
  getFieldsByClassification,
  getPIIFields,
  getSensitiveFields,
  listDomains,
  redactPII,
  isPiiKey,
  audit,
  logAdminAction,
  logError,
} from "../../src/services/compliance.js";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getFieldClassification ─────────────────────────────────────────────────

describe("getFieldClassification", () => {
  it("returns pii for guest.firstName", () => {
    expect(getFieldClassification("guest", "firstName")).toBe("pii");
  });

  it("returns pii for guest.phone", () => {
    expect(getFieldClassification("guest", "phone")).toBe("pii");
  });

  it("returns public for guest.count", () => {
    expect(getFieldClassification("guest", "count")).toBe("public");
  });

  it("returns internal for guest.status", () => {
    expect(getFieldClassification("guest", "status")).toBe("internal");
  });

  it("returns sensitive for guest.mealNotes", () => {
    expect(getFieldClassification("guest", "mealNotes")).toBe("sensitive");
  });

  it("returns undefined for unknown domain", () => {
    expect(getFieldClassification("unknown", "field")).toBeUndefined();
  });

  it("returns undefined for unknown field", () => {
    expect(getFieldClassification("guest", "nonExistentField")).toBeUndefined();
  });
});

// ── isPII ──────────────────────────────────────────────────────────────────

describe("isPII", () => {
  it("returns true for pii field", () => {
    expect(isPII("guest", "phone")).toBe(true);
  });

  it("returns true for sensitive field", () => {
    expect(isPII("guest", "mealNotes")).toBe(true);
  });

  it("returns false for public field", () => {
    expect(isPII("guest", "count")).toBe(false);
  });

  it("returns false for internal field", () => {
    expect(isPII("guest", "status")).toBe(false);
  });

  it("returns false for unknown domain/field", () => {
    expect(isPII("ghost", "nothing")).toBe(false);
  });
});

// ── getFieldsByClassification ──────────────────────────────────────────────

describe("getFieldsByClassification", () => {
  it("returns empty array for unknown domain", () => {
    expect(getFieldsByClassification("ghost", "pii")).toEqual([]);
  });

  it("sensitive minLevel returns only sensitive fields", () => {
    const fields = getFieldsByClassification("guest", "sensitive");
    expect(fields).toContain("mealNotes");
    expect(fields).toContain("accessibility");
    expect(fields).not.toContain("phone"); // phone is pii, not sensitive
  });

  it("pii minLevel returns pii + sensitive fields", () => {
    const fields = getFieldsByClassification("guest", "pii");
    expect(fields).toContain("firstName");
    expect(fields).toContain("phone");
    expect(fields).toContain("mealNotes"); // sensitive is included
  });

  it("returns empty for unknown minLevel", () => {
    expect(getFieldsByClassification("guest", "invalid")).toEqual([]);
  });
});

// ── getPIIFields ───────────────────────────────────────────────────────────

describe("getPIIFields", () => {
  it("returns pii and sensitive fields for guest domain", () => {
    const fields = getPIIFields("guest");
    expect(fields).toContain("firstName");
    expect(fields).toContain("lastName");
    expect(fields).toContain("phone");
    expect(fields).toContain("email");
    expect(fields).toContain("mealNotes");
  });

  it("returns empty array for unknown domain", () => {
    expect(getPIIFields("unknown")).toEqual([]);
  });
});

// ── getSensitiveFields ─────────────────────────────────────────────────────

describe("getSensitiveFields", () => {
  it("returns only sensitive fields for guest", () => {
    const fields = getSensitiveFields("guest");
    expect(fields).toContain("mealNotes");
    expect(fields).toContain("accessibility");
    expect(fields).not.toContain("firstName"); // pii, not sensitive
  });
});

// ── listDomains ────────────────────────────────────────────────────────────

describe("listDomains", () => {
  it("includes guest, table, vendor, expense, contact", () => {
    const domains = listDomains();
    expect(domains).toContain("guest");
    expect(domains).toContain("table");
    expect(domains).toContain("vendor");
    expect(domains).toContain("expense");
    expect(domains).toContain("contact");
  });
});

// ── redactPII ──────────────────────────────────────────────────────────────

describe("redactPII", () => {
  it("nulls out pii fields", () => {
    const guest = {
      id: "g1",
      firstName: "ישראל",
      lastName: "ישראלי",
      phone: "972501234567",
      status: "confirmed",
      count: 2,
    };
    const redacted = redactPII("guest", guest);
    expect(redacted.firstName).toBeNull();
    expect(redacted.lastName).toBeNull();
    expect(redacted.phone).toBeNull();
  });

  it("preserves non-pii fields", () => {
    const guest = { id: "g1", status: "confirmed", count: 2, firstName: "Test" };
    const redacted = redactPII("guest", guest);
    expect(redacted.id).toBe("g1");
    expect(redacted.status).toBe("confirmed");
    expect(redacted.count).toBe(2);
  });

  it("does not mutate original object", () => {
    const guest = { firstName: "Test", phone: "123" };
    redactPII("guest", guest);
    expect(guest.firstName).toBe("Test");
  });

  it("handles unknown domain gracefully (no nulling)", () => {
    const obj = { foo: "bar" };
    const result = redactPII("ghost", obj);
    expect(result.foo).toBe("bar");
  });
});

// ── isPiiKey ───────────────────────────────────────────────────────────────

describe("isPiiKey", () => {
  it("returns true for guests (GUEST_PRIVATE)", () => {
    expect(isPiiKey("guests")).toBe(true);
  });

  it("returns false for tables (EVENT_INTERNAL)", () => {
    expect(isPiiKey("tables")).toBe(false);
  });

  it("returns false for unknown key", () => {
    expect(isPiiKey("nonexistent")).toBe(false);
  });
});

// ── audit / logAdminAction / logError — early exit when not supabase ────────

describe("audit early exit", () => {
  it("does not throw when backend is local (no fetch)", () => {
    // getBackendTypeConfig returns "local" — should be a no-op
    expect(() => audit("INSERT", "guests", "g1")).not.toThrow();
  });
});

describe("logAdminAction early exit", () => {
  it("does not throw when backend is local", () => {
    expect(() => logAdminAction("guests:create", "g1")).not.toThrow();
  });
});

describe("logError early exit", () => {
  it("does not throw when backend is local", () => {
    expect(() => logError(new Error("test"), { context: "test" })).not.toThrow();
  });
});
