/**
 * tests/unit/number-helpers.test.mjs — Sprint 180
 */

import { describe, it, expect } from "vitest";
import {
  clamp, roundTo, toPercent, parseNumber,
  isInteger, sumBy, avgBy, minBy, maxBy, lerp,
} from "../../src/utils/number-helpers.js";

describe("clamp", () => {
  it("returns value within range", () => { expect(clamp(5, 0, 10)).toBe(5); });
  it("clamps to min", () => { expect(clamp(-3, 0, 10)).toBe(0); });
  it("clamps to max", () => { expect(clamp(15, 0, 10)).toBe(10); });
  it("handles equal min/max", () => { expect(clamp(7, 5, 5)).toBe(5); });
});

describe("roundTo", () => {
  it("rounds to 0 decimals by default", () => { expect(roundTo(2.6)).toBe(3); });
  it("rounds to specified decimals", () => { expect(roundTo(1.2345, 2)).toBe(1.23); });
  it("rounds to 2 decimals", () => { expect(roundTo(1.456, 2)).toBe(1.46); });
  it("returns whole number for 0 decimals", () => { expect(roundTo(10.9)).toBe(11); });
});

describe("toPercent", () => {
  it("computes correct percentage", () => { expect(toPercent(1, 4)).toBe(25); });
  it("returns 0 when total is 0", () => { expect(toPercent(5, 0)).toBe(0); });
  it("rounds to specified decimals", () => { expect(toPercent(1, 3, 2)).toBe(33.33); });
  it("handles 100%", () => { expect(toPercent(100, 100)).toBe(100); });
});

describe("parseNumber", () => {
  it("parses valid number string", () => { expect(parseNumber("42")).toBe(42); });
  it("removes commas", () => { expect(parseNumber("1,500")).toBe(1500); });
  it("returns fallback for non-numeric", () => { expect(parseNumber("abc")).toBe(0); });
  it("uses custom fallback", () => { expect(parseNumber("x", -1)).toBe(-1); });
  it("parses decimals", () => { expect(parseNumber("3.14")).toBeCloseTo(3.14); });
});

describe("isInteger", () => {
  it("returns true for integer", () => { expect(isInteger(5)).toBe(true); });
  it("returns false for float", () => { expect(isInteger(5.5)).toBe(false); });
  it("returns false for string", () => { expect(isInteger("5")).toBe(false); });
  it("returns false for NaN", () => { expect(isInteger(NaN)).toBe(false); });
});

describe("sumBy", () => {
  const data = [{ v: 10 }, { v: 20 }, { v: 30 }];
  it("sums field values", () => { expect(sumBy(data, "v")).toBe(60); });
  it("returns 0 for empty array", () => { expect(sumBy([], "v")).toBe(0); });
  it("treats non-numeric as 0", () => { expect(sumBy([{ v: "x" }], "v")).toBe(0); });
});

describe("avgBy", () => {
  const data = [{ v: 10 }, { v: 20 }, { v: 30 }];
  it("averages field values", () => { expect(avgBy(data, "v")).toBeCloseTo(20); });
  it("returns 0 for empty array", () => { expect(avgBy([], "v")).toBe(0); });
});

describe("minBy", () => {
  it("returns minimum", () => { expect(minBy([{ v: 5 }, { v: 1 }, { v: 3 }], "v")).toBe(1); });
  it("returns Infinity for empty", () => { expect(minBy([], "v")).toBe(Infinity); });
});

describe("maxBy", () => {
  it("returns maximum", () => { expect(maxBy([{ v: 5 }, { v: 1 }, { v: 9 }], "v")).toBe(9); });
  it("returns -Infinity for empty", () => { expect(maxBy([], "v")).toBe(-Infinity); });
});

describe("lerp", () => {
  it("interpolates at t=0.5", () => { expect(lerp(0, 100, 0.5)).toBe(50); });
  it("returns start at t=0", () => { expect(lerp(10, 20, 0)).toBe(10); });
  it("returns end at t=1", () => { expect(lerp(10, 20, 1)).toBe(20); });
  it("clamps t below 0", () => { expect(lerp(10, 20, -1)).toBe(10); });
  it("clamps t above 1", () => { expect(lerp(10, 20, 2)).toBe(20); });
});
