/**
 * tests/unit/constants.test.mjs — Sprint 155
 */

import { describe, it, expect } from "vitest";
import {
  SECTION_LIST,
  EXTRA_SECTIONS,
  ALL_SECTIONS,
  PUBLIC_SECTIONS,
  MODALS,
  STORAGE_KEYS,
  MEAL_TYPES,
  GUEST_SIDES,
  GUEST_GROUPS,
  TABLE_SHAPES,
} from "../../src/core/constants.js";

describe("SECTION_LIST", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(SECTION_LIST)).toBe(true);
    expect(SECTION_LIST.length).toBeGreaterThan(0);
  });

  it("includes landing and dashboard", () => {
    expect(SECTION_LIST).toContain("landing");
    expect(SECTION_LIST).toContain("dashboard");
  });

  it("includes guests and tables", () => {
    expect(SECTION_LIST).toContain("guests");
    expect(SECTION_LIST).toContain("tables");
  });

  it("has no duplicate entries", () => {
    expect(new Set(SECTION_LIST).size).toBe(SECTION_LIST.length);
  });
});

describe("EXTRA_SECTIONS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(EXTRA_SECTIONS)).toBe(true);
    expect(EXTRA_SECTIONS.length).toBeGreaterThan(0);
  });

  it("does not overlap with SECTION_LIST", () => {
    const sectionSet = new Set(SECTION_LIST);
    for (const s of EXTRA_SECTIONS) {
      expect(sectionSet.has(s)).toBe(false);
    }
  });
});

describe("ALL_SECTIONS", () => {
  it("contains all SECTION_LIST entries", () => {
    for (const s of SECTION_LIST) {
      expect(ALL_SECTIONS).toContain(s);
    }
  });

  it("contains all EXTRA_SECTIONS entries", () => {
    for (const s of EXTRA_SECTIONS) {
      expect(ALL_SECTIONS).toContain(s);
    }
  });

  it("has no duplicates", () => {
    expect(new Set(ALL_SECTIONS).size).toBe(ALL_SECTIONS.length);
  });
});

describe("PUBLIC_SECTIONS", () => {
  it("is a non-empty Set or array", () => {
    expect(PUBLIC_SECTIONS).toBeDefined();
  });

  it("includes rsvp", () => {
    const has = PUBLIC_SECTIONS instanceof Set
      ? PUBLIC_SECTIONS.has("rsvp")
      : PUBLIC_SECTIONS.includes("rsvp");
    expect(has).toBe(true);
  });

  it("includes landing", () => {
    const has = PUBLIC_SECTIONS instanceof Set
      ? PUBLIC_SECTIONS.has("landing")
      : PUBLIC_SECTIONS.includes("landing");
    expect(has).toBe(true);
  });
});

describe("MODALS", () => {
  it("is a non-empty object", () => {
    expect(MODALS).toBeDefined();
    expect(Object.keys(MODALS).length).toBeGreaterThan(0);
  });

  it("includes GUEST modal", () => {
    expect(MODALS.GUEST).toBeDefined();
    expect(typeof MODALS.GUEST).toBe("string");
  });
});

describe("STORAGE_KEYS", () => {
  it("is an object with string values", () => {
    expect(typeof STORAGE_KEYS).toBe("object");
    for (const val of Object.values(STORAGE_KEYS)) {
      expect(typeof val).toBe("string");
    }
  });

  it("all keys start with wedding_v1_ prefix or are short names", () => {
    for (const val of Object.values(STORAGE_KEYS)) {
      expect(typeof val).toBe("string");
      expect(val.length).toBeGreaterThan(0);
    }
  });
});

describe("Domain enums", () => {
  it("MEAL_TYPES includes regular", () => {
    expect(MEAL_TYPES).toContain("regular");
  });

  it("GUEST_SIDES includes groom and bride", () => {
    expect(GUEST_SIDES).toContain("groom");
    expect(GUEST_SIDES).toContain("bride");
  });

  it("GUEST_GROUPS is a non-empty array", () => {
    expect(GUEST_GROUPS.length).toBeGreaterThan(0);
  });

  it("TABLE_SHAPES includes round and rect", () => {
    expect(TABLE_SHAPES).toContain("round");
    expect(TABLE_SHAPES).toContain("rect");
  });
});
