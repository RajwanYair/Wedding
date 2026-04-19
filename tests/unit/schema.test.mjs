/**
 * tests/unit/schema.test.mjs — Unit tests for src/utils/schema.js
 *
 * Tests Valibot-based schema parsing for all domain models:
 * Guest, Table, Vendor, Expense.
 */

import { describe, it, expect } from "vitest";
import {
  parseGuest,
  parseTable,
  parseVendor,
  parseExpense,
  safeParse,
  GuestSchema,
} from "../../src/utils/schema.js";

// ── parseGuest ────────────────────────────────────────────────────────────

describe("parseGuest", () => {
  it("parses a valid minimal guest", () => {
    const result = parseGuest({ firstName: "יוסי" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.firstName).toBe("יוסי");
      expect(result.output.status).toBe("pending");
      expect(result.output.count).toBe(1);
    }
  });

  it("trims whitespace from string fields", () => {
    const result = parseGuest({ firstName: "  שרה  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.firstName).toBe("שרה");
    }
  });

  it("applies default status:pending", () => {
    const result = parseGuest({ firstName: "דן" });
    if (result.success) expect(result.output.status).toBe("pending");
  });

  it("accepts all valid statuses", () => {
    for (const status of ["pending", "confirmed", "declined", "maybe"]) {
      const r = parseGuest({ firstName: "א", status });
      expect(r.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = parseGuest({ firstName: "א", status: "unknown" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid meal types", () => {
    for (const meal of ["regular", "vegetarian", "vegan", "gluten_free", "kosher"]) {
      const r = parseGuest({ firstName: "א", meal });
      expect(r.success).toBe(true);
    }
  });

  it("applies defaults for count and children", () => {
    const result = parseGuest({ firstName: "מור" });
    if (result.success) {
      expect(result.output.count).toBe(1);
      expect(result.output.children).toBe(0);
    }
  });

  it("fails without firstName", () => {
    const result = parseGuest({ lastName: "כהן" });
    expect(result.success).toBe(false);
  });

  it("clamps firstName to 100 chars", () => {
    const long = "א".repeat(150);
    const result = parseGuest({ firstName: long });
    expect(result.success).toBe(false); // maxLength violation
  });

  it("accepts notes up to 1000 chars", () => {
    const result = parseGuest({ firstName: "א", notes: "x".repeat(1000) });
    expect(result.success).toBe(true);
  });

  it("rejects notes over 1000 chars", () => {
    const result = parseGuest({ firstName: "א", notes: "x".repeat(1001) });
    expect(result.success).toBe(false);
  });

  it("defaults sent and checkedIn to false", () => {
    const result = parseGuest({ firstName: "א" });
    if (result.success) {
      expect(result.output.sent).toBe(false);
      expect(result.output.checkedIn).toBe(false);
    }
  });
});

// ── parseTable ────────────────────────────────────────────────────────────

describe("parseTable", () => {
  it("parses a valid table", () => {
    const result = parseTable({ name: "שולחן 1", capacity: 8 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.name).toBe("שולחן 1");
      expect(result.output.capacity).toBe(8);
      expect(result.output.shape).toBe("round");
    }
  });

  it("fails without name", () => {
    const result = parseTable({ capacity: 8 });
    expect(result.success).toBe(false);
  });

  it("fails without capacity", () => {
    const result = parseTable({ name: "שולחן" });
    expect(result.success).toBe(false);
  });

  it("rejects capacity of 0", () => {
    const result = parseTable({ name: "שולחן", capacity: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts round and rect shapes", () => {
    expect(parseTable({ name: "א", capacity: 4, shape: "round" }).success).toBe(true);
    expect(parseTable({ name: "א", capacity: 4, shape: "rect" }).success).toBe(true);
  });

  it("rejects unknown shape", () => {
    const result = parseTable({ name: "א", capacity: 4, shape: "triangle" });
    expect(result.success).toBe(false);
  });
});

// ── parseVendor ───────────────────────────────────────────────────────────

describe("parseVendor", () => {
  it("parses a valid vendor", () => {
    const result = parseVendor({ name: "DJ מוסיקה", price: 3000, paid: 1000 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.name).toBe("DJ מוסיקה");
      expect(result.output.price).toBe(3000);
      expect(result.output.paid).toBe(1000);
    }
  });

  it("fails without name", () => {
    const result = parseVendor({ price: 500 });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = parseVendor({ name: "צלם", price: -100 });
    expect(result.success).toBe(false);
  });

  it("defaults price and paid to 0", () => {
    const result = parseVendor({ name: "צלם" });
    if (result.success) {
      expect(result.output.price).toBe(0);
      expect(result.output.paid).toBe(0);
    }
  });
});

// ── parseExpense ──────────────────────────────────────────────────────────

describe("parseExpense", () => {
  it("parses a valid expense", () => {
    const result = parseExpense({ description: "פרחים", amount: 500 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.description).toBe("פרחים");
      expect(result.output.amount).toBe(500);
    }
  });

  it("fails without description", () => {
    const result = parseExpense({ amount: 200 });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = parseExpense({ description: "החזר", amount: -50 });
    expect(result.success).toBe(false);
  });

  it("accepts zero amount", () => {
    const result = parseExpense({ description: "מתנה", amount: 0 });
    expect(result.success).toBe(true);
  });
});

// ── safeParse ─────────────────────────────────────────────────────────────

describe("safeParse", () => {
  it("returns { success: true, output } for valid data", () => {
    const result = safeParse(GuestSchema, { firstName: "אחד" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.output.firstName).toBe("אחד");
  });

  it("returns { success: false, issues } for invalid data", () => {
    const result = safeParse(GuestSchema, { firstName: 42 });
    expect(result.success).toBe(false);
    if (!result.success) expect(Array.isArray(result.issues)).toBe(true);
  });
});
