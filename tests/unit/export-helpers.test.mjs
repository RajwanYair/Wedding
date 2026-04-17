/**
 * tests/unit/export-helpers.test.mjs — Unit tests for export helpers (Sprint 33)
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from "vitest";
import {
  escapeCSV,
  rowsToCSV,
  guestsToCSV,
  vendorsToCSV,
  expensesToCSV,
  toJSON,
  jsonToBlob,
  parseCSV,
} from "../../src/utils/export-helpers.js";
import { makeGuest, makeVendor, makeExpense } from "./helpers.js";

// ── escapeCSV ─────────────────────────────────────────────────────────────

describe("escapeCSV", () => {
  it("returns plain string unchanged", () => {
    expect(escapeCSV("hello")).toBe("hello");
  });

  it("wraps strings containing commas in quotes", () => {
    expect(escapeCSV("hello, world")).toBe('"hello, world"');
  });

  it("escapes internal double-quotes", () => {
    expect(escapeCSV('she said "hi"')).toBe('"she said ""hi"""');
  });

  it("handles null → empty string", () => {
    expect(escapeCSV(null)).toBe("");
  });

  it("handles undefined → empty string", () => {
    expect(escapeCSV(undefined)).toBe("");
  });

  it("wraps strings containing newlines", () => {
    expect(escapeCSV("line1\nline2")).toBe('"line1\nline2"');
  });

  it("coerces numbers to string", () => {
    expect(escapeCSV(42)).toBe("42");
  });
});

// ── rowsToCSV ──────────────────────────────────────────────────────────────

describe("rowsToCSV", () => {
  const rows = [
    { name: "Alice", count: 2, notes: "vip, early" },
    { name: "Bob", count: 1, notes: "" },
  ];

  it("starts with UTF-8 BOM", () => {
    expect(rowsToCSV(rows).charCodeAt(0)).toBe(0xfeff);
  });

  it("first line is header from object keys", () => {
    const lines = rowsToCSV(rows).slice(1).split("\n");
    expect(lines[0]).toBe("name,count,notes");
  });

  it("data rows follow header", () => {
    const lines = rowsToCSV(rows).slice(1).split("\n");
    expect(lines[1]).toBe('Alice,2,"vip, early"');
  });

  it("respects explicit columns order", () => {
    const csv = rowsToCSV(rows, { columns: ["count", "name"] });
    const lines = csv.slice(1).split("\n");
    expect(lines[0]).toBe("count,name");
  });

  it("returns BOM-only for empty array", () => {
    expect(rowsToCSV([])).toBe("\uFEFF");
  });
});

// ── guestsToCSV ────────────────────────────────────────────────────────────

describe("guestsToCSV", () => {
  it("exports guests as CSV with correct headers", () => {
    const csv = guestsToCSV([makeGuest({ firstName: "Alice", lastName: "Smith" })]);
    expect(csv).toContain("firstName");
    expect(csv).toContain("Alice");
    expect(csv).toContain("Smith");
  });

  it("returns BOM-only for empty array", () => {
    expect(guestsToCSV([])).toBe("\uFEFF");
  });
});

// ── vendorsToCSV ───────────────────────────────────────────────────────────

describe("vendorsToCSV", () => {
  it("exports vendors with correct field names", () => {
    const csv = vendorsToCSV([makeVendor({ name: "DJ Pro" })]);
    expect(csv).toContain("category");
    expect(csv).toContain("DJ Pro");
  });
});

// ── expensesToCSV ──────────────────────────────────────────────────────────

describe("expensesToCSV", () => {
  it("exports expenses with correct field names", () => {
    const csv = expensesToCSV([makeExpense({ description: "Wedding dinner", amount: 5000 })]);
    expect(csv).toContain("description");
    expect(csv).toContain("Wedding dinner");
  });
});

// ── toJSON ─────────────────────────────────────────────────────────────────

describe("toJSON", () => {
  it("serializes object to indented JSON", () => {
    const json = toJSON({ a: 1, b: "hello" });
    expect(JSON.parse(json)).toEqual({ a: 1, b: "hello" });
  });

  it("uses indent=2 by default", () => {
    const json = toJSON({ a: 1 });
    expect(json).toContain("  ");
  });

  it("handles circular references with [circular] placeholder", () => {
    const obj = /** @type {any} */ ({ a: 1 });
    obj.self = obj;
    const json = toJSON(obj);
    expect(json).toContain("[circular]");
  });
});

// ── jsonToBlob ────────────────────────────────────────────────────────────

describe("jsonToBlob", () => {
  it("returns a Blob", () => {
    expect(jsonToBlob({ a: 1 })).toBeInstanceOf(Blob);
  });

  it("blob has application/json type", () => {
    expect(jsonToBlob({}).type).toBe("application/json");
  });
});

// ── parseCSV ──────────────────────────────────────────────────────────────

describe("parseCSV", () => {
  it("parses headers and data rows", () => {
    const rows = parseCSV("name,count\nAlice,2\nBob,1");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: "Alice", count: "2" });
    expect(rows[1]).toEqual({ name: "Bob", count: "1" });
  });

  it("handles BOM-prefixed CSV", () => {
    const rows = parseCSV("\uFEFFname,count\nAlice,2");
    expect(rows[0].name).toBe("Alice");
  });

  it("handles quoted cells with commas", () => {
    const rows = parseCSV('name,notes\nAlice,"vip, early"');
    expect(rows[0].notes).toBe("vip, early");
  });

  it("handles escaped quotes within cells", () => {
    const rows = parseCSV('name,notes\nBob,"said ""hello"""');
    expect(rows[0].notes).toBe('said "hello"');
  });

  it("returns empty array for CSV with only header", () => {
    expect(parseCSV("name,count")).toHaveLength(0);
  });

  it("rowsToCSV → parseCSV round-trips", () => {
    const original = [{ name: "Alice, Smith", count: "2", notes: 'said "hi"' }];
    const csv = rowsToCSV(original);
    const parsed = parseCSV(csv);
    expect(parsed[0]).toEqual(original[0]);
  });
});
