/**
 * tests/unit/domain-enums.test.mjs — Unit tests for domain enum objects (Sprint 51)
 */

import { describe, it, expect } from "vitest";
import {
  GUEST_STATUS_OPTIONS, GUEST_STATUS_VALUES,
  GUEST_SIDE_OPTIONS, GUEST_SIDE_VALUES,
  GUEST_GROUP_OPTIONS, GUEST_GROUP_VALUES,
  MEAL_OPTIONS, MEAL_VALUES,
  TABLE_SHAPE_OPTIONS, TABLE_SHAPE_VALUES,
  VENDOR_CATEGORY_OPTIONS, VENDOR_CATEGORY_VALUES,
  EXPENSE_CATEGORY_OPTIONS, EXPENSE_CATEGORY_VALUES,
  TIMELINE_CATEGORY_OPTIONS, TIMELINE_CATEGORY_VALUES,
  CAMPAIGN_TYPE_OPTIONS, CAMPAIGN_TYPE_VALUES,
  DELIVERY_STATUS_OPTIONS, DELIVERY_STATUS_VALUES,
  findOption, isValidEnumValue,
} from "../../src/core/domain-enums.js";

// ── Structure invariants ──────────────────────────────────────────────────

const ALL_OPTION_LISTS = [
  ["GUEST_STATUS_OPTIONS",  GUEST_STATUS_OPTIONS],
  ["GUEST_SIDE_OPTIONS",    GUEST_SIDE_OPTIONS],
  ["GUEST_GROUP_OPTIONS",   GUEST_GROUP_OPTIONS],
  ["MEAL_OPTIONS",          MEAL_OPTIONS],
  ["TABLE_SHAPE_OPTIONS",   TABLE_SHAPE_OPTIONS],
  ["VENDOR_CATEGORY_OPTIONS", VENDOR_CATEGORY_OPTIONS],
  ["EXPENSE_CATEGORY_OPTIONS", EXPENSE_CATEGORY_OPTIONS],
  ["TIMELINE_CATEGORY_OPTIONS", TIMELINE_CATEGORY_OPTIONS],
  ["CAMPAIGN_TYPE_OPTIONS", CAMPAIGN_TYPE_OPTIONS],
  ["DELIVERY_STATUS_OPTIONS", DELIVERY_STATUS_OPTIONS],
];

describe("all option lists — structure invariants", () => {
  for (const [name, list] of ALL_OPTION_LISTS) {
    it(`${name}: each item has value, labelKey, color, icon`, () => {
      for (const item of list) {
        expect(typeof item.value,    `${name}[${item.value}].value`).toBe("string");
        expect(typeof item.labelKey, `${name}[${item.value}].labelKey`).toBe("string");
        expect(typeof item.color,    `${name}[${item.value}].color`).toBe("string");
        expect(typeof item.icon,     `${name}[${item.value}].icon`).toBe("string");
      }
    });

    it(`${name}: values are unique`, () => {
      const values = list.map((o) => o.value);
      expect(new Set(values).size).toBe(values.length);
    });
  }
});

// ── Value sets ────────────────────────────────────────────────────────────

describe("value sets match option list values", () => {
  it("GUEST_STATUS_VALUES contains all status values", () => {
    for (const o of GUEST_STATUS_OPTIONS) expect(GUEST_STATUS_VALUES.has(o.value)).toBe(true);
  });
  it("MEAL_VALUES contains all meal values", () => {
    for (const o of MEAL_OPTIONS) expect(MEAL_VALUES.has(o.value)).toBe(true);
  });
  it("VENDOR_CATEGORY_VALUES contains all vendor category values", () => {
    for (const o of VENDOR_CATEGORY_OPTIONS) expect(VENDOR_CATEGORY_VALUES.has(o.value)).toBe(true);
  });
});

// ── Content spot-checks ───────────────────────────────────────────────────

describe("GUEST_STATUS_OPTIONS", () => {
  it("includes confirmed, pending, declined, maybe", () => {
    expect(GUEST_STATUS_VALUES.has("confirmed")).toBe(true);
    expect(GUEST_STATUS_VALUES.has("pending")).toBe(true);
    expect(GUEST_STATUS_VALUES.has("declined")).toBe(true);
    expect(GUEST_STATUS_VALUES.has("maybe")).toBe(true);
  });
});

describe("MEAL_OPTIONS", () => {
  it("includes kosher and vegan", () => {
    expect(MEAL_VALUES.has("kosher")).toBe(true);
    expect(MEAL_VALUES.has("vegan")).toBe(true);
  });
});

describe("TIMELINE_CATEGORY_OPTIONS", () => {
  it("includes ceremony and reception", () => {
    expect(TIMELINE_CATEGORY_VALUES.has("ceremony")).toBe(true);
    expect(TIMELINE_CATEGORY_VALUES.has("reception")).toBe(true);
  });
});

// ── findOption ────────────────────────────────────────────────────────────

describe("findOption", () => {
  it("returns matching option", () => {
    const opt = findOption(GUEST_STATUS_OPTIONS, "confirmed");
    expect(opt?.labelKey).toBe("status_confirmed");
    expect(opt?.icon).toBe("✅");
  });

  it("returns undefined for unknown value", () => {
    expect(findOption(GUEST_STATUS_OPTIONS, "__bad__")).toBeUndefined();
  });
});

// ── isValidEnumValue ──────────────────────────────────────────────────────

describe("isValidEnumValue", () => {
  it("returns true for valid member", () => {
    expect(isValidEnumValue(GUEST_STATUS_VALUES, "confirmed")).toBe(true);
  });

  it("returns false for invalid string", () => {
    expect(isValidEnumValue(GUEST_STATUS_VALUES, "unknown")).toBe(false);
  });

  it("returns false for non-string", () => {
    expect(isValidEnumValue(GUEST_STATUS_VALUES, 42)).toBe(false);
    expect(isValidEnumValue(GUEST_STATUS_VALUES, null)).toBe(false);
  });
});
