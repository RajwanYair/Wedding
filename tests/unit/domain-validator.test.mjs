/**
 * tests/unit/domain-validator.test.mjs — Tests for domain-validator.js (Sprint 56)
 */

import { describe, it, expect } from "vitest";
import {
  validateGuest,
  validateTable,
  validateVendor,
  validateExpense,
} from "../../src/services/domain-validator.js";

// ── validateGuest ─────────────────────────────────────────────────────────

describe("validateGuest", () => {
  it("returns valid for a minimal valid guest", () => {
    const r = validateGuest({ firstName: "Alice", lastName: "B" });
    expect(r.valid).toBe(true);
    expect(Object.keys(r.errors)).toHaveLength(0);
  });

  it("requires firstName", () => {
    const r = validateGuest({ lastName: "B" });
    expect(r.valid).toBe(false);
    expect(r.errors.firstName).toBeTruthy();
  });

  it("requires lastName", () => {
    const r = validateGuest({ firstName: "A" });
    expect(r.valid).toBe(false);
    expect(r.errors.lastName).toBeTruthy();
  });

  it("rejects invalid email", () => {
    const r = validateGuest({ firstName: "A", lastName: "B", email: "notanemail" });
    expect(r.valid).toBe(false);
    expect(r.errors.email).toBeTruthy();
  });

  it("accepts valid email", () => {
    const r = validateGuest({ firstName: "A", lastName: "B", email: "a@b.com" });
    expect(r.valid).toBe(true);
  });

  it("rejects invalid status", () => {
    const r = validateGuest({ firstName: "A", lastName: "B", status: "unknown_status" });
    expect(r.errors.status).toBeTruthy();
  });

  it("accepts valid status values", () => {
    for (const status of ["pending", "confirmed", "declined", "maybe"]) {
      const r = validateGuest({ firstName: "A", lastName: "B", status });
      expect(r.errors.status, `status=${status}`).toBeUndefined();
    }
  });

  it("rejects invalid side", () => {
    const r = validateGuest({ firstName: "A", lastName: "B", side: "mystery" });
    expect(r.errors.side).toBeTruthy();
  });

  it("rejects count < 1", () => {
    const r = validateGuest({ firstName: "A", lastName: "B", count: 0 });
    expect(r.errors.count).toBeTruthy();
  });

  it("accepts count = 1", () => {
    const r = validateGuest({ firstName: "A", lastName: "B", count: 1 });
    expect(r.valid).toBe(true);
  });

  it("rejects children < 0", () => {
    const r = validateGuest({ firstName: "A", lastName: "B", children: -1 });
    expect(r.errors.children).toBeTruthy();
  });

  it("rejects non-object with _root error", () => {
    expect(validateGuest(null).valid).toBe(false);
    expect(validateGuest("string").valid).toBe(false);
  });
});

// ── validateTable ─────────────────────────────────────────────────────────

describe("validateTable", () => {
  it("valid minimal table", () => {
    expect(validateTable({ name: "T1", capacity: 8 }).valid).toBe(true);
  });

  it("requires name", () => {
    expect(validateTable({ capacity: 8 }).errors.name).toBeTruthy();
  });

  it("requires capacity >= 1", () => {
    expect(validateTable({ name: "T1", capacity: 0 }).errors.capacity).toBeTruthy();
    expect(validateTable({ name: "T1" }).errors.capacity).toBeTruthy();
  });

  it("rejects invalid shape", () => {
    expect(validateTable({ name: "T1", capacity: 8, shape: "triangle" }).errors.shape).toBeTruthy();
  });

  it("accepts valid shape", () => {
    expect(validateTable({ name: "T1", capacity: 8, shape: "round" }).valid).toBe(true);
    expect(validateTable({ name: "T1", capacity: 8, shape: "rect" }).valid).toBe(true);
  });
});

// ── validateVendor ────────────────────────────────────────────────────────

describe("validateVendor", () => {
  it("valid minimal vendor", () => {
    expect(validateVendor({ name: "DJ Max" }).valid).toBe(true);
  });

  it("requires name", () => {
    expect(validateVendor({}).errors.name).toBeTruthy();
  });

  it("rejects invalid category", () => {
    expect(validateVendor({ name: "X", category: "robots" }).errors.category).toBeTruthy();
  });

  it("rejects negative price", () => {
    expect(validateVendor({ name: "X", price: -100 }).errors.price).toBeTruthy();
  });

  it("accepts 0 as price", () => {
    expect(validateVendor({ name: "X", price: 0 }).errors.price).toBeUndefined();
  });
});

// ── validateExpense ───────────────────────────────────────────────────────

describe("validateExpense", () => {
  it("valid minimal expense", () => {
    expect(validateExpense({ description: "Flowers", amount: 500 }).valid).toBe(true);
  });

  it("requires description", () => {
    expect(validateExpense({ amount: 500 }).errors.description).toBeTruthy();
  });

  it("requires amount", () => {
    expect(validateExpense({ description: "Flowers" }).errors.amount).toBeTruthy();
  });

  it("rejects negative amount", () => {
    expect(validateExpense({ description: "X", amount: -1 }).errors.amount).toBeTruthy();
  });

  it("accepts amount = 0", () => {
    expect(validateExpense({ description: "X", amount: 0 }).errors.amount).toBeUndefined();
  });

  it("rejects invalid category", () => {
    expect(validateExpense({ description: "X", amount: 10, category: "weapons" }).errors.category).toBeTruthy();
  });
});
