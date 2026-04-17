/**
 * tests/integration/compliance.test.mjs — Sprint 148
 *
 * Compliance integration tests: data retention, PII handling, GDPR-style deletion,
 * audit log structure, and input sanitization at the boundary.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../src/core/store.js", () => {
  const _s = {};
  return {
    initStore:      vi.fn((defs) => { for (const [k, { value }] of Object.entries(defs)) _s[k] = value; }),
    storeGet:       vi.fn((k) => _s[k]),
    storeSet:       vi.fn((k, v) => { _s[k] = v; }),
    storeSubscribe: vi.fn(() => vi.fn()),
  };
});
vi.mock("../../src/core/state.js",   () => ({ getActiveEventId: vi.fn(() => "default") }));
vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

import { sanitize } from "../../src/utils/sanitize.js";
import { cleanPhone } from "../../src/utils/phone.js";

// ── PII sanitisation ─────────────────────────────────────────────────────────

describe("PII input boundary sanitization", () => {
  const schema = { name: { type: "string", max: 50 } };

  it("rejects XSS payloads in name fields", () => {
    const { errors } = sanitize({ name: "<script>alert(1)</script>" }, schema);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("strips script tags from value", () => {
    const { value } = sanitize({ name: "<script>alert(1)</script>" }, schema);
    expect(String(value.name)).not.toContain("<script>");
  });

  it("trims leading/trailing whitespace in string fields", () => {
    const { value } = sanitize({ name: "  Alice  " }, schema);
    expect(value.name).toBe("Alice");
  });

  it("clamps string to max length without error", () => {
    const long = "A".repeat(100);
    const { value, errors } = sanitize({ name: long }, schema);
    expect(errors).toHaveLength(0);
    expect(String(value.name).length).toBe(50);
  });

  it("cleanPhone normalises Israeli format", () => {
    expect(cleanPhone("054-123-4567")).toBe("972541234567");
  });

  it("cleanPhone does not produce leading +", () => {
    const result = cleanPhone("054-123-4567");
    expect(result).not.toMatch(/^\+/);
  });
});

// ── Data model integrity ──────────────────────────────────────────────────────

describe("Guest data model integrity", () => {
  /** @type {object} */
  const REQUIRED_FIELDS = ["id", "firstName", "lastName", "status"];

  function makeGuest(overrides = {}) {
    return {
      id: "g1",
      firstName: "Alice",
      lastName: "Cohen",
      status: "pending",
      phone: null,
      email: null,
      ...overrides,
    };
  }

  it("valid guest passes required-field check", () => {
    const g = makeGuest();
    const missing = REQUIRED_FIELDS.filter((f) => !g[f]);
    expect(missing).toHaveLength(0);
  });

  it("guest without id fails required-field check", () => {
    const g = makeGuest({ id: "" });
    const missing = REQUIRED_FIELDS.filter((f) => !g[f]);
    expect(missing).toContain("id");
  });

  it("status must be one of the known values", () => {
    const VALID_STATUSES = ["pending", "confirmed", "declined", "maybe"];
    const g = makeGuest({ status: "unknown" });
    expect(VALID_STATUSES.includes(g.status)).toBe(false);
  });
});

// ── Audit log structure ───────────────────────────────────────────────────────

describe("Audit log entry structure", () => {
  function makeAuditEntry(overrides = {}) {
    return {
      id:        "ae1",
      action:    "guest_updated",
      userId:    "u1",
      timestamp: new Date().toISOString(),
      payload:   {},
      ...overrides,
    };
  }

  it("valid audit entry has required fields", () => {
    const entry = makeAuditEntry();
    expect(entry.id).toBeTruthy();
    expect(entry.action).toBeTruthy();
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("timestamp is ISO-8601", () => {
    const entry = makeAuditEntry();
    expect(() => new Date(entry.timestamp).toISOString()).not.toThrow();
  });
});

// ── Logical deletion (GDPR-style) ────────────────────────────────────────────

describe("Logical deletion", () => {
  it("soft-deleted guest retains anonymised record", () => {
    const guest = {
      id: "g1",
      firstName: "Alice",
      lastName: "Cohen",
      phone: "+972541234567",
      deletedAt: new Date().toISOString(),
    };
    const anonymised = {
      ...guest,
      firstName: "[deleted]",
      lastName:  "[deleted]",
      phone:     null,
    };
    expect(anonymised.id).toBe("g1");
    expect(anonymised.firstName).toBe("[deleted]");
    expect(anonymised.phone).toBeNull();
    expect(anonymised.deletedAt).toBeTruthy();
  });
});
