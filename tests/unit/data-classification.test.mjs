/**
 * tests/unit/data-classification.test.mjs — Tests for privacy.js (Sprint 62)
 */

import { describe, it, expect } from "vitest";
import {
  getFieldClassification,
  isPII,
  getFieldsByClassification,
  getPIIFields,
  getSensitiveFields,
  listDomains,
  redactPII,
} from "../../src/services/privacy.js";

describe("getFieldClassification", () => {
  it("returns correct level for guest.phone", () => {
    expect(getFieldClassification("guest", "phone")).toBe("pii");
  });

  it("returns correct level for guest.accessibility", () => {
    expect(getFieldClassification("guest", "accessibility")).toBe("sensitive");
  });

  it("returns correct level for guest.status", () => {
    expect(getFieldClassification("guest", "status")).toBe("internal");
  });

  it("returns correct level for guest.count", () => {
    expect(getFieldClassification("guest", "count")).toBe("public");
  });

  it("returns undefined for unknown domain", () => {
    expect(getFieldClassification("__bad__", "phone")).toBeUndefined();
  });

  it("returns undefined for unknown field", () => {
    expect(getFieldClassification("guest", "__nope__")).toBeUndefined();
  });
});

describe("isPII", () => {
  it("returns true for phone", () => {
    expect(isPII("guest", "phone")).toBe(true);
  });

  it("returns true for accessibility (sensitive)", () => {
    expect(isPII("guest", "accessibility")).toBe(true);
  });

  it("returns false for guest.count (public)", () => {
    expect(isPII("guest", "count")).toBe(false);
  });

  it("returns false for unknown field", () => {
    expect(isPII("guest", "__unknown__")).toBe(false);
  });
});

describe("getPIIFields", () => {
  it("includes pii and sensitive fields but not public/internal for guest", () => {
    const fields = getPIIFields("guest");
    expect(fields).toContain("phone");
    expect(fields).toContain("email");
    expect(fields).toContain("firstName");
    expect(fields).toContain("mealNotes");
    expect(fields).not.toContain("count");
    expect(fields).not.toContain("status");
  });

  it("returns empty array for unknown domain", () => {
    expect(getPIIFields("bogus")).toStrictEqual([]);
  });
});

describe("getSensitiveFields", () => {
  it("includes only sensitive fields for guest", () => {
    const fields = getSensitiveFields("guest");
    expect(fields).toContain("mealNotes");
    expect(fields).toContain("accessibility");
    expect(fields).not.toContain("phone");
    expect(fields).not.toContain("status");
  });

  it("returns empty array for unknown domain", () => {
    expect(getSensitiveFields("bogus")).toStrictEqual([]);
  });
});

describe("listDomains", () => {
  it("returns known domain names", () => {
    const domains = listDomains();
    expect(domains).toContain("guest");
    expect(domains).toContain("vendor");
    expect(domains).toContain("expense");
    expect(domains).toContain("table");
  });
});

describe("redactPII", () => {
  it("nulls out PII and sensitive fields on a copy", () => {
    const guest = { id: "g1", firstName: "Alice", phone: "050-123", count: 2, status: "confirmed", mealNotes: "no nuts" };
    const redacted = redactPII("guest", guest);
    expect(redacted.firstName).toBeNull();
    expect(redacted.phone).toBeNull();
    expect(redacted.mealNotes).toBeNull();
  });

  it("does not modify the original object", () => {
    const guest = { id: "g1", firstName: "Alice", phone: "050-123", count: 2 };
    redactPII("guest", guest);
    expect(guest.firstName).toBe("Alice");
  });

  it("preserves non-PII fields", () => {
    const guest = { id: "g1", firstName: "Alice", count: 3, status: "pending" };
    const redacted = redactPII("guest", guest);
    expect(redacted.count).toBe(3);
    expect(redacted.status).toBe("pending");
  });

  it("ignores fields not present on the object", () => {
    const guest = { id: "g1", count: 1 };
    const redacted = redactPII("guest", guest);
    expect(Object.hasOwn(redacted, "phone")).toBe(false);
  });
});
