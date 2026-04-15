/**
 * tests/unit/utils.test.mjs — Unit tests for src/utils/ (S6.2)
 * Covers: phone · date · sanitize · misc
 *
 * Run: npm test
 */

import { describe, it, expect } from "vitest";
import { cleanPhone, isValidPhone } from "../../src/utils/phone.js";
import { daysUntil, formatDateHebrew, nowISOJerusalem } from "../../src/utils/date.js";
import { sanitize, sanitizeInput } from "../../src/utils/sanitize.js";
import { uid, guestFullName } from "../../src/utils/misc.js";

// ── cleanPhone ───────────────────────────────────────────────────────────────
describe("cleanPhone", () => {
  it("converts 05X to 9725X", () => {
    expect(cleanPhone("0501234567")).toBe("972501234567");
  });

  it("strips spaces and dashes", () => {
    expect(cleanPhone("054-123 4567")).toBe("972541234567");
  });

  it("keeps already-international number", () => {
    expect(cleanPhone("+972541234567")).toBe("972541234567");
  });

  it("handles empty string", () => {
    expect(cleanPhone("")).toBe("");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanPhone(null)).toBe("");
    expect(cleanPhone(undefined)).toBe("");
  });
});

// ── isValidPhone ──────────────────────────────────────────────────────────────
describe("isValidPhone", () => {
  it("accepts valid 12-digit E.164", () => {
    expect(isValidPhone("972541234567")).toBe(true);
  });

  it("rejects too-short number", () => {
    expect(isValidPhone("12345")).toBe(false);
  });

  it("rejects number with plus sign", () => {
    expect(isValidPhone("+972541234567")).toBe(false);
  });

  it("rejects alphabet chars", () => {
    expect(isValidPhone("97254abc567")).toBe(false);
  });
});

// ── daysUntil ─────────────────────────────────────────────────────────────────
describe("daysUntil", () => {
  it("returns positive for future dates", () => {
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString();
    expect(daysUntil(future)).toBeGreaterThan(0);
  });

  it("returns negative for past dates", () => {
    const past = new Date(Date.now() - 10 * 86_400_000).toISOString();
    expect(daysUntil(past)).toBeLessThan(0);
  });

  it("returns ~0 for today", () => {
    const today = new Date(Date.now() + 60_000).toISOString(); // 1 min from now
    expect(daysUntil(today)).toBeLessThanOrEqual(1);
  });
});

// ── formatDateHebrew ──────────────────────────────────────────────────────────
describe("formatDateHebrew", () => {
  it("returns non-empty string for valid ISO date", () => {
    expect(formatDateHebrew("2025-09-12")).toBeTruthy();
  });

  it("returns empty string for invalid date", () => {
    expect(formatDateHebrew("not-a-date")).toBe("");
  });

  it("contains year 2025 for 2025 date", () => {
    const result = formatDateHebrew("2025-09-12");
    expect(result).toContain("2025");
  });
});

// ── nowISOJerusalem ───────────────────────────────────────────────────────────
describe("nowISOJerusalem", () => {
  it("returns a string containing a T separator", () => {
    expect(nowISOJerusalem()).toMatch(/T/);
  });

  it("returns current year", () => {
    const year = new Date().getFullYear().toString();
    expect(nowISOJerusalem()).toContain(year);
  });
});

// ── sanitizeInput ─────────────────────────────────────────────────────────────
describe("sanitizeInput", () => {
  it("trims whitespace", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
  });

  it("clamps to max length", () => {
    expect(sanitizeInput("a".repeat(1000), 10)).toHaveLength(10);
  });

  it("handles null/undefined", () => {
    expect(sanitizeInput(null)).toBe("");
    expect(sanitizeInput(undefined)).toBe("");
  });
});

// ── sanitize ──────────────────────────────────────────────────────────────────
describe("sanitize", () => {
  const schema = {
    name: { type: "string", max: 50, required: true },
    age: { type: "number", min: 0, max: 120 },
    email: { type: "email" },
    active: { type: "boolean" },
    phone: { type: "phone" },
  };

  it("accepts valid input", () => {
    const { value, errors } = sanitize(
      { name: "Alice", age: 30, email: "a@b.co", active: true, phone: "972501234567" },
      schema,
    );
    expect(errors).toHaveLength(0);
    expect(value.name).toBe("Alice");
    expect(value.age).toBe(30);
  });

  it("reports required field error", () => {
    const { errors } = sanitize({ age: 25 }, schema);
    expect(errors.some((e) => e.includes("name"))).toBe(true);
  });

  it("rejects script injection in string field", () => {
    const { errors } = sanitize({ name: "<script>alert(1)</script>", age: 0, email: "a@b.co" }, schema);
    expect(errors.some((e) => e.includes("name"))).toBe(true);
  });

  it("clamps number to max", () => {
    const { value } = sanitize({ name: "Bob", age: 999 }, schema);
    expect(value.age).toBeLessThanOrEqual(120);
  });

  it("rejects invalid email", () => {
    const { errors } = sanitize({ name: "X", email: "bad-email" }, schema);
    expect(errors.some((e) => e.includes("email"))).toBe(true);
  });

  it("rejects invalid phone", () => {
    const { errors } = sanitize({ name: "Y", phone: "123" }, schema);
    expect(errors.some((e) => e.includes("phone"))).toBe(true);
  });

  it("handles boolean coercion", () => {
    const { value } = sanitize({ name: "Z", active: "true" }, schema);
    expect(value.active).toBe(true);
  });
});

// ── uid ───────────────────────────────────────────────────────────────────────
describe("uid", () => {
  it("returns non-empty string", () => {
    expect(uid()).toBeTruthy();
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, uid));
    expect(ids.size).toBe(100);
  });

  it("has alphanumeric characters only", () => {
    expect(uid()).toMatch(/^[a-z0-9]+$/);
  });
});

// ── guestFullName ─────────────────────────────────────────────────────────────
describe("guestFullName", () => {
  it("joins first and last name", () => {
    expect(guestFullName({ firstName: "Alice", lastName: "Smith" })).toBe("Alice Smith");
  });

  it("returns just first name when no last name", () => {
    expect(guestFullName({ firstName: "Alice" })).toBe("Alice");
  });

  it("handles empty object", () => {
    expect(guestFullName({})).toBe("");
  });
});
