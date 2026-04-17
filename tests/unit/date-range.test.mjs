/**
 * tests/unit/date-range.test.mjs — Sprint 181
 */

import { describe, it, expect } from "vitest";
import {
  createDateRange, isInRange, overlaps, daysUntil, daysBetween, formatDateRange, expandDays,
} from "../../src/utils/date-range.js";

describe("createDateRange", () => {
  it("returns object with start and end Date instances", () => {
    const r = createDateRange("2025-01-01", "2025-01-05");
    expect(r.start).toBeInstanceOf(Date);
    expect(r.end).toBeInstanceOf(Date);
  });

  it("preserves dates correctly", () => {
    const r = createDateRange("2025-01-01", "2025-12-31");
    expect(r.start.getFullYear()).toBe(2025);
    expect(r.end.getMonth()).toBe(11); // December = 11
  });
});

describe("isInRange", () => {
  const r = createDateRange("2025-01-01", "2025-01-10");

  it("returns true for date inside range", () => {
    expect(isInRange("2025-01-05", r)).toBe(true);
  });

  it("returns true for dates on boundaries (inclusive)", () => {
    expect(isInRange("2025-01-01", r)).toBe(true);
    expect(isInRange("2025-01-10", r)).toBe(true);
  });

  it("returns false for date before range", () => {
    expect(isInRange("2024-12-31", r)).toBe(false);
  });

  it("returns false for date after range", () => {
    expect(isInRange("2025-01-11", r)).toBe(false);
  });
});

describe("overlaps", () => {
  it("returns true for overlapping ranges", () => {
    const a = createDateRange("2025-01-01", "2025-01-10");
    const b = createDateRange("2025-01-05", "2025-01-15");
    expect(overlaps(a, b)).toBe(true);
  });

  it("returns true for touching ranges (shared endpoint)", () => {
    const a = createDateRange("2025-01-01", "2025-01-05");
    const b = createDateRange("2025-01-05", "2025-01-10");
    expect(overlaps(a, b)).toBe(true);
  });

  it("returns false for non-overlapping ranges", () => {
    const a = createDateRange("2025-01-01", "2025-01-04");
    const b = createDateRange("2025-01-06", "2025-01-10");
    expect(overlaps(a, b)).toBe(false);
  });

  it("returns true for contained range", () => {
    const outer = createDateRange("2025-01-01", "2025-01-31");
    const inner = createDateRange("2025-01-10", "2025-01-20");
    expect(overlaps(outer, inner)).toBe(true);
  });
});

describe("daysUntil", () => {
  it("returns positive for future date", () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
    expect(daysUntil(future)).toBeGreaterThanOrEqual(4);
  });

  it("returns negative for past date", () => {
    const past = new Date(Date.now() - 5 * 86_400_000).toISOString();
    expect(daysUntil(past)).toBeLessThanOrEqual(-4);
  });
});

describe("daysBetween", () => {
  it("counts full days between two dates", () => {
    expect(daysBetween("2025-01-01", "2025-01-06")).toBe(5);
  });

  it("is symmetric (order doesn't matter)", () => {
    expect(daysBetween("2025-01-06", "2025-01-01")).toBe(5);
  });

  it("returns 0 for same date", () => {
    expect(daysBetween("2025-01-01", "2025-01-01")).toBe(0);
  });
});

describe("formatDateRange", () => {
  it("returns a non-empty string", () => {
    const r = createDateRange("2025-01-01", "2025-01-05");
    const result = formatDateRange(r, "en-US");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains an en-dash separator", () => {
    const r = createDateRange("2025-01-01", "2025-01-05");
    expect(formatDateRange(r)).toContain("–");
  });
});

describe("expandDays", () => {
  it("expands a 3-day range into 3 Date objects", () => {
    const r = createDateRange("2025-01-01", "2025-01-03");
    const days = expandDays(r);
    expect(days).toHaveLength(3);
    days.forEach((d) => expect(d).toBeInstanceOf(Date));
  });

  it("single-day range returns one element", () => {
    const r = createDateRange("2025-06-15", "2025-06-15");
    expect(expandDays(r)).toHaveLength(1);
  });
});
