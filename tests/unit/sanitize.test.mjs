/**
 * tests/unit/sanitize.test.mjs — Sprint 179
 */

import { describe, it, expect } from "vitest";
import { sanitizeInput, sanitize } from "../../src/utils/sanitize.js";

// ── sanitizeInput ─────────────────────────────────────────────────────────

describe("sanitizeInput", () => {
  it("returns empty string for null/undefined", () => {
    expect(sanitizeInput(null)).toBe("");
    expect(sanitizeInput(undefined)).toBe("");
  });

  it("trims whitespace", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
  });

  it("clamps to default max (500)", () => {
    const long = "a".repeat(600);
    expect(sanitizeInput(long)).toHaveLength(500);
  });

  it("clamps to custom max", () => {
    expect(sanitizeInput("hello world", 5)).toBe("hello");
  });

  it("coerces numbers to string", () => {
    expect(sanitizeInput(42)).toBe("42");
  });
});

// ── sanitize — string type ────────────────────────────────────────────────

describe("sanitize — string field", () => {
  const schema = { name: { type: "string" } };

  it("trims and returns string", () => {
    const { value, errors } = sanitize({ name: "  Alice  " }, schema);
    expect(value.name).toBe("Alice");
    expect(errors).toHaveLength(0);
  });

  it("returns empty and error for script-injection", () => {
    const { value, errors } = sanitize({ name: "<script>alert(1)</script>" }, schema);
    expect(value.name).toBe("");
    expect(errors).toContain("name contains invalid content");
  });

  it("handles required missing field", () => {
    const { value, errors } = sanitize({}, { name: { type: "string", required: true } });
    expect(value.name).toBe("");
    expect(errors).toContain("name is required");
  });

  it("drops unknown keys", () => {
    const { value } = sanitize({ name: "Alice", extra: "x" }, schema);
    expect(value).not.toHaveProperty("extra");
  });

  it("clips to max length", () => {
    const { value } = sanitize({ name: "a".repeat(600) }, { name: { type: "string", max: 10 } });
    expect(String(value.name)).toHaveLength(10);
  });
});

// ── sanitize — number type ────────────────────────────────────────────────

describe("sanitize — number field", () => {
  it("coerces string to number", () => {
    const { value } = sanitize({ count: "5" }, { count: { type: "number" } });
    expect(value.count).toBe(5);
  });

  it("uses min clamp", () => {
    const { value } = sanitize({ count: -5 }, { count: { type: "number", min: 0 } });
    expect(value.count).toBe(0);
  });

  it("uses max clamp", () => {
    const { value } = sanitize({ count: 200 }, { count: { type: "number", max: 100 } });
    expect(value.count).toBe(100);
  });

  it("errors on NaN", () => {
    const { errors } = sanitize({ count: "abc" }, { count: { type: "number" } });
    expect(errors).toContain("count must be a number");
  });
});

// ── sanitize — boolean type ───────────────────────────────────────────────

describe("sanitize — boolean field", () => {
  it("coerces truthy to true", () => {
    const { value } = sanitize({ active: "yes" }, { active: { type: "boolean" } });
    expect(value.active).toBe(true);
  });

  it("coerces falsy to false", () => {
    const { value } = sanitize({ active: 0 }, { active: { type: "boolean" } });
    expect(value.active).toBe(false);
  });

  it("defaults missing to false", () => {
    const { value } = sanitize({}, { active: { type: "boolean" } });
    expect(value.active).toBe(false);
  });
});

// ── sanitize — phone type ─────────────────────────────────────────────────

describe("sanitize — phone field", () => {
  it("normalises Israeli 05X number", () => {
    const { value, errors } = sanitize({ phone: "0541234567" }, { phone: { type: "phone" } });
    expect(value.phone).toBe("972541234567");
    expect(errors).toHaveLength(0);
  });

  it("errors on obviously invalid phone", () => {
    const { errors } = sanitize({ phone: "abc" }, { phone: { type: "phone" } });
    expect(errors).toContain("phone is not a valid phone number");
  });
});

// ── sanitize — email type ─────────────────────────────────────────────────

describe("sanitize — email field", () => {
  it("lower-cases valid email", () => {
    const { value, errors } = sanitize({ email: "Test@Example.COM" }, { email: { type: "email" } });
    expect(value.email).toBe("test@example.com");
    expect(errors).toHaveLength(0);
  });

  it("errors on invalid email", () => {
    const { errors } = sanitize({ email: "notanemail" }, { email: { type: "email" } });
    expect(errors).toContain("email is not a valid email");
  });
});

// ── sanitize — url type ───────────────────────────────────────────────────

describe("sanitize — url field", () => {
  it("accepts valid https URL", () => {
    const { value, errors } = sanitize(
      { link: "https://example.com" },
      { link: { type: "url" } },
    );
    expect(value.link).toBe("https://example.com");
    expect(errors).toHaveLength(0);
  });

  it("errors on http URL", () => {
    const { errors } = sanitize({ link: "http://example.com" }, { link: { type: "url" } });
    expect(errors).toContain("link must be a valid HTTPS URL");
  });

  it("errors on non-URL string", () => {
    const { errors } = sanitize({ link: "not a url" }, { link: { type: "url" } });
    expect(errors).toContain("link must be a valid HTTPS URL");
  });
});
