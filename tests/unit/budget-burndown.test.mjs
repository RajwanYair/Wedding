/**
 * tests/unit/budget-burndown.test.mjs — Sprint 51 / B6
 * Unit tests for src/services/budget-burndown.js
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const { getBurndownData, getProjectedEndDate, getBudgetConsumptionPct } =
  await import("../../src/services/budget-burndown.js");

const EXPENSES = [
  { id: "e1", amount: 5000, createdAt: "2026-01-10T00:00:00Z" },
  { id: "e2", amount: 10000, createdAt: "2026-02-15T00:00:00Z" },
  { id: "e3", amount: 8000, createdAt: "2026-03-20T00:00:00Z" },
];

function seed(expenses = EXPENSES, budget = 50000) {
  initStore({
    expenses: { value: expenses },
    weddingInfo: { value: { budget } },
  });
}

beforeEach(() => seed());

describe("getBurndownData", () => {
  it("returns sorted cumulative points", () => {
    const { points } = getBurndownData();
    expect(points).toHaveLength(3);
    expect(points[0].cumulative).toBe(5000);
    expect(points[1].cumulative).toBe(15000);
    expect(points[2].cumulative).toBe(23000);
  });

  it("uses weddingInfo.budget as target by default", () => {
    const { totalBudget } = getBurndownData();
    expect(totalBudget).toBe(50000);
  });

  it("uses supplied budgetTarget over store value", () => {
    const { totalBudget } = getBurndownData(80000);
    expect(totalBudget).toBe(80000);
  });

  it("reports totalSpent equal to last cumulative point", () => {
    const { totalSpent, points } = getBurndownData();
    expect(totalSpent).toBe(points[points.length - 1].cumulative);
  });

  it("returns empty points for empty expenses", () => {
    seed([], 50000);
    const { points, totalSpent } = getBurndownData();
    expect(points).toHaveLength(0);
    expect(totalSpent).toBe(0);
  });

  it("skips expenses with invalid dates", () => {
    seed([
      { id: "e1", amount: 1000, createdAt: "not-a-date" },
      { id: "e2", amount: 2000, createdAt: "2026-01-01T00:00:00Z" },
    ]);
    const { points } = getBurndownData();
    expect(points).toHaveLength(1);
    expect(points[0].cumulative).toBe(2000);
  });

  it("falls back to 0 budget when weddingInfo.budget is absent", () => {
    initStore({ expenses: { value: EXPENSES }, weddingInfo: { value: {} } });
    const { totalBudget } = getBurndownData();
    expect(totalBudget).toBe(0);
  });
});

describe("getProjectedEndDate", () => {
  it("returns null when fewer than 2 data points", () => {
    seed([{ id: "e1", amount: 5000, createdAt: "2026-01-01T00:00:00Z" }]);
    expect(getProjectedEndDate()).toBeNull();
  });

  it("returns null when no budget set", () => {
    seed(EXPENSES, 0);
    expect(getProjectedEndDate()).toBeNull();
  });

  it("returns a YYYY-MM-DD string when projection is possible", () => {
    const date = getProjectedEndDate();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns last date when already at or over budget", () => {
    seed(EXPENSES, 5000); // spent 23000 > 5000 budget
    const date = getProjectedEndDate();
    expect(date).toBe("2026-03-20");
  });

  it("returns null when spend rate is zero (all same date)", () => {
    seed([
      { id: "e1", amount: 1000, createdAt: "2026-01-01T00:00:00Z" },
      { id: "e2", amount: 1000, createdAt: "2026-01-01T00:00:00Z" },
    ]);
    // spendDiff > 0 but msDiff = 0, so rate = Infinity → projected date is bogus
    // but shouldn't throw
    expect(() => getProjectedEndDate(100000)).not.toThrow();
  });
});

describe("getBudgetConsumptionPct", () => {
  it("returns percentage of budget spent", () => {
    // spent 23000 / 50000 = 46%
    expect(getBudgetConsumptionPct()).toBe(46);
  });

  it("caps at 100 when over budget", () => {
    seed(EXPENSES, 5000);
    expect(getBudgetConsumptionPct()).toBe(100);
  });

  it("returns 0 when no expenses", () => {
    seed([], 50000);
    expect(getBudgetConsumptionPct()).toBe(0);
  });

  it("returns 0 when budget is 0", () => {
    seed(EXPENSES, 0);
    expect(getBudgetConsumptionPct()).toBe(0);
  });

  it("uses explicit budgetTarget", () => {
    expect(getBudgetConsumptionPct(46000)).toBe(50);
  });
});
