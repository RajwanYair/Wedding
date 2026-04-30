import { describe, it, expect } from "vitest";
import {
  spendByCategory,
  forecast,
  projectFinal,
} from "../../src/utils/budget-forecast.js";

describe("budget-forecast", () => {
  it("spendByCategory sums amounts per category", () => {
    const m = spendByCategory([
      { category: "venue", amount: 1000 },
      { category: "venue", amount: 250 },
      { category: "food", amount: 800 },
    ]);
    expect(m.get("venue")).toBe(1250);
    expect(m.get("food")).toBe(800);
  });

  it("spendByCategory ignores invalid rows", () => {
    const m = spendByCategory([
      null,
      {},
      { category: "x", amount: "bad" },
      { category: "y", amount: 50 },
    ]);
    expect(m.has("x")).toBe(false);
    expect(m.get("y")).toBe(50);
  });

  it("forecast computes per-category remaining + utilisation", () => {
    const f = forecast(
      [{ category: "venue", amount: 1000 }, { category: "food", amount: 500 }],
      [
        { category: "venue", amount: 600 },
        { category: "food", amount: 700 },
      ],
    );
    const venue = f.categories.find((c) => c.category === "venue");
    const food = f.categories.find((c) => c.category === "food");
    expect(venue.remaining).toBe(400);
    expect(venue.utilisation).toBeCloseTo(0.6);
    expect(food.overBudget).toBe(true);
    expect(food.variance).toBe(-200);
  });

  it("forecast totals roll up correctly", () => {
    const f = forecast(
      [{ category: "venue", amount: 1000 }],
      [{ category: "venue", amount: 250 }],
    );
    expect(f.totalBudget).toBe(1000);
    expect(f.totalSpent).toBe(250);
    expect(f.totalRemaining).toBe(750);
    expect(f.utilisation).toBeCloseTo(0.25);
  });

  it("forecast surfaces unbudgeted spending categories", () => {
    const f = forecast(
      [{ category: "venue", amount: 1000 }],
      [{ category: "tips", amount: 100 }],
    );
    const tips = f.categories.find((c) => c.category === "tips");
    expect(tips.budget).toBe(0);
    expect(tips.overBudget).toBe(true);
    expect(f.categoriesOverBudget).toBe(1);
  });

  it("forecast handles empty inputs", () => {
    const f = forecast([], []);
    expect(f.totalBudget).toBe(0);
    expect(f.totalSpent).toBe(0);
    expect(f.utilisation).toBe(0);
    expect(f.categories).toEqual([]);
  });

  it("forecast counts categories over budget", () => {
    const f = forecast(
      [
        { category: "a", amount: 100 },
        { category: "b", amount: 100 },
      ],
      [
        { category: "a", amount: 150 },
        { category: "b", amount: 50 },
      ],
    );
    expect(f.categoriesOverBudget).toBe(1);
  });

  it("projectFinal scales linearly", () => {
    expect(projectFinal(500, 0.5)).toBe(1000);
    expect(projectFinal(300, 0.25)).toBe(1200);
  });

  it("projectFinal caps at 100% progress", () => {
    expect(projectFinal(800, 1)).toBe(800);
    expect(projectFinal(800, 1.5)).toBe(800);
  });

  it("projectFinal returns NaN for non-positive or invalid progress", () => {
    expect(Number.isNaN(projectFinal(100, 0))).toBe(true);
    expect(Number.isNaN(projectFinal(100, -0.2))).toBe(true);
    expect(Number.isNaN(projectFinal("bad", 0.5))).toBe(true);
  });
});
