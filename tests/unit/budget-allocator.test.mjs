import { describe, it, expect } from "vitest";
import { allocate, applySpending } from "../../src/utils/budget-allocator.js";

describe("budget-allocator", () => {
  it("allocates by weight", () => {
    const out = allocate(100, [
      { category: "food", weight: 0.5 },
      { category: "venue", weight: 0.3 },
      { category: "music", weight: 0.2 },
    ]);
    expect(out.map((a) => a.amount)).toEqual([50, 30, 20]);
  });

  it("renormalises weights that don't sum to 1", () => {
    const out = allocate(1000, [
      { category: "a", weight: 5 },
      { category: "b", weight: 5 },
    ]);
    expect(out.map((a) => a.amount)).toEqual([500, 500]);
  });

  it("distributes rounding remainder to largest fractions", () => {
    const out = allocate(10, [
      { category: "a", weight: 1 },
      { category: "b", weight: 1 },
      { category: "c", weight: 1 },
    ]);
    const sum = out.reduce((acc, a) => acc + a.amount, 0);
    expect(sum).toBe(10);
  });

  it("emits percent rounded to 1 decimal", () => {
    const out = allocate(1000, [
      { category: "a", weight: 1 },
      { category: "b", weight: 2 },
    ]);
    expect(out[0].percent).toBeCloseTo(33.3, 1);
    expect(out[1].percent).toBeCloseTo(66.7, 1);
  });

  it("drops zero/negative weights", () => {
    const out = allocate(100, [
      { category: "a", weight: 1 },
      { category: "b", weight: 0 },
      { category: "c", weight: -1 },
    ]);
    expect(out.map((a) => a.category)).toEqual(["a"]);
  });

  it("returns [] for no valid weights", () => {
    expect(allocate(100, [])).toEqual([]);
    expect(allocate(100, [{ category: "x", weight: 0 }])).toEqual([]);
  });

  it("handles total=0", () => {
    const out = allocate(0, [{ category: "a", weight: 1 }]);
    expect(out[0].amount).toBe(0);
    expect(out[0].percent).toBe(0);
  });

  it("rejects non-finite/negative total", () => {
    expect(() => allocate(-1, [])).toThrow(RangeError);
    expect(() => allocate(NaN, [])).toThrow(RangeError);
  });

  it("applySpending subtracts spent amounts", () => {
    const a = allocate(100, [
      { category: "food", weight: 0.5 },
      { category: "music", weight: 0.5 },
    ]);
    const out = applySpending(a, { food: 30 });
    expect(out[0].spent).toBe(30);
    expect(out[0].remaining).toBe(20);
    expect(out[0].over).toBe(false);
  });

  it("applySpending flags over-budget", () => {
    const a = allocate(100, [{ category: "food", weight: 1 }]);
    const out = applySpending(a, { food: 150 });
    expect(out[0].over).toBe(true);
    expect(out[0].remaining).toBe(-50);
  });

  it("applySpending defaults missing categories to 0", () => {
    const a = allocate(100, [{ category: "food", weight: 1 }]);
    const out = applySpending(a, {});
    expect(out[0].spent).toBe(0);
  });

  it("applySpending ignores non-finite spent values", () => {
    const a = allocate(100, [{ category: "food", weight: 1 }]);
    const out = applySpending(a, { food: NaN });
    expect(out[0].spent).toBe(0);
  });
});
