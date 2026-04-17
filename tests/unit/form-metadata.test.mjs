/**
 * tests/unit/form-metadata.test.mjs — Unit tests for form-metadata.js (Sprint 55)
 */

import { describe, it, expect } from "vitest";
import {
  GUEST_FIELDS,
  TABLE_FIELDS,
  VENDOR_FIELDS,
  EXPENSE_FIELDS,
  getFieldMeta,
  listFieldNames,
  getRequiredFields,
} from "../../src/utils/form-metadata.js";

// ── Structural invariants ─────────────────────────────────────────────────

const ALL_FIELD_LISTS = [
  ["GUEST_FIELDS",   GUEST_FIELDS],
  ["TABLE_FIELDS",   TABLE_FIELDS],
  ["VENDOR_FIELDS",  VENDOR_FIELDS],
  ["EXPENSE_FIELDS", EXPENSE_FIELDS],
];

describe("all field lists — structure invariants", () => {
  for (const [name, list] of ALL_FIELD_LISTS) {
    it(`${name}: each item has name, labelKey, type`, () => {
      for (const f of list) {
        expect(typeof f.name,     `${name}/${f.name}.name`).toBe("string");
        expect(typeof f.labelKey, `${name}/${f.name}.labelKey`).toBe("string");
        expect(typeof f.type,     `${name}/${f.name}.type`).toBe("string");
      }
    });

    it(`${name}: field names are unique`, () => {
      const names = list.map((f) => f.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it(`${name}: select fields have options array`, () => {
      for (const f of list) {
        if (f.type === "select") {
          expect(Array.isArray(f.options), `${name}/${f.name} missing options`).toBe(true);
          expect(f.options.length).toBeGreaterThan(0);
        }
      }
    });
  }
});

// ── Content spot-checks ───────────────────────────────────────────────────

describe("GUEST_FIELDS", () => {
  it("includes firstName, phone, status, meal", () => {
    const names = GUEST_FIELDS.map((f) => f.name);
    expect(names).toContain("firstName");
    expect(names).toContain("phone");
    expect(names).toContain("status");
    expect(names).toContain("meal");
  });

  it("firstName is required", () => {
    expect(GUEST_FIELDS.find((f) => f.name === "firstName")?.required).toBe(true);
  });
});

describe("TABLE_FIELDS", () => {
  it("name and capacity are required", () => {
    const req = TABLE_FIELDS.filter((f) => f.required).map((f) => f.name);
    expect(req).toContain("name");
    expect(req).toContain("capacity");
  });
});

describe("EXPENSE_FIELDS", () => {
  it("description and amount are required", () => {
    const req = EXPENSE_FIELDS.filter((f) => f.required).map((f) => f.name);
    expect(req).toContain("description");
    expect(req).toContain("amount");
  });
});

// ── getFieldMeta ──────────────────────────────────────────────────────────

describe("getFieldMeta", () => {
  it("returns correct meta for guest/status", () => {
    const meta = getFieldMeta("guest", "status");
    expect(meta?.type).toBe("select");
    expect(Array.isArray(meta?.options)).toBe(true);
  });

  it("returns correct meta for table/capacity", () => {
    const meta = getFieldMeta("table", "capacity");
    expect(meta?.type).toBe("number");
    expect(meta?.required).toBe(true);
  });

  it("returns undefined for unknown domain", () => {
    expect(getFieldMeta("unknown", "field")).toBeUndefined();
  });

  it("returns undefined for unknown field in known domain", () => {
    expect(getFieldMeta("guest", "__nope__")).toBeUndefined();
  });
});

// ── listFieldNames ────────────────────────────────────────────────────────

describe("listFieldNames", () => {
  it("returns array of field names for guest domain", () => {
    const names = listFieldNames("guest");
    expect(Array.isArray(names)).toBe(true);
    expect(names).toContain("firstName");
    expect(names).toContain("status");
  });

  it("returns empty array for unknown domain", () => {
    expect(listFieldNames("bogus")).toStrictEqual([]);
  });
});

// ── getRequiredFields ─────────────────────────────────────────────────────

describe("getRequiredFields", () => {
  it("returns required fields for guest", () => {
    const req = getRequiredFields("guest");
    expect(req.length).toBeGreaterThan(0);
    for (const f of req) expect(f.required).toBe(true);
  });

  it("returns empty array for unknown domain", () => {
    expect(getRequiredFields("bogus")).toStrictEqual([]);
  });

  it("vendor has at least name as required", () => {
    const req = getRequiredFields("vendor").map((f) => f.name);
    expect(req).toContain("name");
  });
});
