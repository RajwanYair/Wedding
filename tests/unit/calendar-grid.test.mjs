import { describe, it, expect } from "vitest";
import {
  monthGrid,
  daysInMonth,
  isLeapYear,
} from "../../src/utils/calendar-grid.js";

describe("calendar-grid", () => {
  it("monthGrid returns 6 rows of 7 cells", () => {
    const g = monthGrid(2026, 9);
    expect(g).toHaveLength(6);
    expect(g.every((r) => r.length === 7)).toBe(true);
  });

  it("monthGrid first row covers leading days", () => {
    // 2026-09-01 is a Tuesday → with firstDayOfWeek=0 (Sun), 2 leading days
    const g = monthGrid(2026, 9);
    expect(g[0][0].isoDate).toBe("2026-08-30");
    expect(g[0][2].isoDate).toBe("2026-09-01");
    expect(g[0][2].inMonth).toBe(true);
    expect(g[0][0].inMonth).toBe(false);
  });

  it("monthGrid Monday-start", () => {
    const g = monthGrid(2026, 9, { firstDayOfWeek: 1 });
    expect(g[0][0].isoDate).toBe("2026-08-31");
  });

  it("monthGrid handles month with 28 days (Feb non-leap)", () => {
    const g = monthGrid(2026, 2);
    const inMonth = g.flat().filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(28);
  });

  it("monthGrid handles leap-year February", () => {
    const g = monthGrid(2024, 2);
    const inMonth = g.flat().filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(29);
  });

  it("monthGrid validates month range", () => {
    expect(() => monthGrid(2026, 0)).toThrow(RangeError);
    expect(() => monthGrid(2026, 13)).toThrow(RangeError);
  });

  it("monthGrid validates year integer", () => {
    expect(() => monthGrid(2026.5, 9)).toThrow(TypeError);
  });

  it("monthGrid validates firstDayOfWeek range", () => {
    expect(() => monthGrid(2026, 9, { firstDayOfWeek: 7 })).toThrow(RangeError);
  });

  it("monthGrid isoDate is YYYY-MM-DD", () => {
    const g = monthGrid(2026, 9);
    expect(g[0][2].isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("daysInMonth handles each month", () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it("isLeapYear Gregorian rules", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
  });
});
