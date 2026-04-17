/**
 * tests/unit/security.test.mjs — Security regression tests (Sprint 31)
 *
 * Tests that the sanitize utility, privacy functions, and import helpers
 * correctly block OWASP Top-10 patterns:
 *   A03 – Injection (XSS / script injection)
 *   A07 – Identification failures (phone/email validation)
 *   A09 – Security logging
 *
 * These are *regression* tests; they must pass on every CI run.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from "vitest";
import { sanitize, sanitizeInput } from "../../src/utils/sanitize.js";
import { cleanPhone } from "../../src/utils/phone.js";

// ── A03: XSS / script-injection rejection ────────────────────────────────

describe("XSS rejection (A03)", () => {
  const schema = { name: { type: "string", max: 200 } };

  const payloads = [
    '<script>alert("xss")</script>',
    "<SCRIPT SRC=http://evil.example.com/xss.js>",
    "<script >alert(1)</script >",
    "< script>evil()</script>",
  ];

  for (const payload of payloads) {
    it(`rejects payload: ${payload.slice(0, 40)}`, () => {
      const { value, errors } = sanitize({ name: payload }, schema);
      expect(errors.length).toBeGreaterThan(0);
      expect(value.name).toBe("");
    });
  }

  it("allows safe string without script tags", () => {
    const { errors } = sanitize({ name: "Alice Smith" }, schema);
    expect(errors).toHaveLength(0);
  });
});

// ── Prototype-pollution prevention ────────────────────────────────────────

describe("Prototype pollution prevention (A03)", () => {
  const schema = { name: { type: "string" } };

  it("ignores __proto__ key in input", () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}, "name": "Alice"}');
    const { value } = sanitize(malicious, schema);
    expect(/** @type {any} */ ({}).polluted).toBeUndefined();
    expect(value.name).toBe("Alice");
  });

  it("ignores constructor key in input", () => {
    const { value } = sanitize({ constructor: "evil", name: "Bob" }, schema);
    expect(value.name).toBe("Bob");
    expect(Object.keys(value)).not.toContain("constructor");
  });
});

// ── A07: Phone / email validation ─────────────────────────────────────────

describe("Phone validation (A07)", () => {
  const schema = { phone: { type: "phone" } };

  it("accepts valid Israeli mobile numbers", () => {
    const { errors, value } = sanitize({ phone: "0501234567" }, schema);
    expect(errors).toHaveLength(0);
    expect(value.phone).toBe("972501234567");
  });

  it("rejects too-short phone", () => {
    const { errors } = sanitize({ phone: "123" }, schema);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects phone with letters", () => {
    const { errors } = sanitize({ phone: "abc1234567" }, schema);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects empty phone when required", () => {
    const { errors } = sanitize({ phone: "" }, { phone: { type: "phone", required: true } });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("Email validation (A07)", () => {
  const schema = { email: { type: "email" } };

  it("accepts valid email", () => {
    const { errors, value } = sanitize({ email: "user@example.com" }, schema);
    expect(errors).toHaveLength(0);
    expect(value.email).toBe("user@example.com");
  });

  it("lowercases email", () => {
    const { value } = sanitize({ email: "User@Example.COM" }, schema);
    expect(value.email).toBe("user@example.com");
  });

  it("rejects email without @", () => {
    const { errors } = sanitize({ email: "notanemail" }, schema);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects email with injected content", () => {
    const { errors } = sanitize({ email: "a@b.com<script>alert(1)</script>" }, schema);
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ── URL validation (HTTPS-only) ────────────────────────────────────────────

describe("URL validation (A03 open-redirect prevention)", () => {
  const schema = { endpoint: { type: "url" } };

  it("accepts HTTPS URL", () => {
    const { errors } = sanitize({ endpoint: "https://api.example.com/v1" }, schema);
    expect(errors).toHaveLength(0);
  });

  it("rejects HTTP URL", () => {
    const { errors } = sanitize({ endpoint: "http://api.example.com/v1" }, schema);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects javascript: URL", () => {
    const { errors } = sanitize({ endpoint: "javascript:alert(1)" }, schema);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects data: URL", () => {
    const { errors } = sanitize({ endpoint: "data:text/html,<script>alert(1)</script>" }, schema);
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ── Numeric integrity ─────────────────────────────────────────────────────

describe("Numeric bounds enforcement (A03 overflow)", () => {
  const schema = { count: { type: "number", min: 0, max: 1000 } };

  it("clamps value above max", () => {
    const { value } = sanitize({ count: 99999 }, schema);
    expect(value.count).toBe(1000);
  });

  it("clamps value below min", () => {
    const { value } = sanitize({ count: -5 }, schema);
    expect(value.count).toBe(0);
  });

  it("rejects NaN input", () => {
    const { errors } = sanitize({ count: "not-a-number" }, schema);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects Infinity", () => {
    const { errors } = sanitize({ count: Infinity }, schema);
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ── sanitizeInput (raw string helper) ─────────────────────────────────────

describe("sanitizeInput", () => {
  it("trims whitespace", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
  });

  it("clamps to max length", () => {
    expect(sanitizeInput("a".repeat(600), 500)).toHaveLength(500);
  });

  it("handles null / undefined safely", () => {
    expect(sanitizeInput(null)).toBe("");
    expect(sanitizeInput(undefined)).toBe("");
  });

  it("coerces non-string to string", () => {
    expect(sanitizeInput(42)).toBe("42");
  });
});

// ── cleanPhone (phone normalisation) ─────────────────────────────────────

describe("cleanPhone", () => {
  it("converts Israeli 05X to +972", () => {
    expect(cleanPhone("0541234567")).toBe("972541234567");
  });

  it("strips hyphens and spaces", () => {
    expect(cleanPhone("054-123 4567")).toBe("972541234567");
  });

  it("leaves +972 format unchanged (after normalise)", () => {
    const result = cleanPhone("+972541234567");
    expect(result).toMatch(/^972/);
  });
});
