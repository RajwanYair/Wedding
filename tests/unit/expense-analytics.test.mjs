/**
 * tests/unit/expense-analytics.test.mjs — Sprint 127
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  getTotalExpenses, groupByCategory, getTopCategories,
  getMonthlyTotals, getBudgetUtilization,
} = await import("../../src/services/analytics.js");

const EXPENSES = [
  { id: "e1", category: "venue",      description: "Hall", amount: 20000, date: "2025-07-01", createdAt: "" },
  { id: "e2", category: "catering",   description: "Food", amount: 15000, date: "2025-07-15", createdAt: "" },
  { id: "e3", category: "venue",      description: "Flowers", amount: 5000, date: "2025-08-01", createdAt: "" },
  { id: "e4", category: "music",      description: "DJ",  amount: 8000,  date: "2025-08-10", createdAt: "" },
];

function seed(expenses = EXPENSES) {
  initStore({
    expenses:    { value: expenses },
    guests:      { value: [] },
    weddingInfo: { value: {} },
  });
}

beforeEach(() => seed());

describe("getTotalExpenses", () => {
  it("sums all amounts", () => {
    expect(getTotalExpenses()).toBe(48000);
  });

  it("returns 0 when no expenses", () => {
    seed([]);
    expect(getTotalExpenses()).toBe(0);
  });
});

describe("groupByCategory", () => {
  it("groups by category with correct totals", () => {
    const groups = groupByCategory();
    expect(groups["venue"].total).toBe(25000);
    expect(groups["venue"].count).toBe(2);
    expect(groups["catering"].total).toBe(15000);
  });
});

describe("getTopCategories", () => {
  it("returns sorted by spend descending", () => {
    const top = getTopCategories(2);
    expect(top[0].category).toBe("venue");
    expect(top[1].category).toBe("catering");
  });

  it("respects n limit", () => {
    expect(getTopCategories(1)).toHaveLength(1);
  });
});

describe("getMonthlyTotals", () => {
  it("groups by YYYY-MM", () => {
    const monthly = getMonthlyTotals();
    const july   = monthly.find((m) => m.month === "2025-07");
    const august = monthly.find((m) => m.month === "2025-08");
    expect(july?.total).toBe(35000);
    expect(august?.total).toBe(13000);
  });

  it("is sorted ascending", () => {
    const monthly = getMonthlyTotals();
    for (let i = 1; i < monthly.length; i++) {
      expect(monthly[i].month >= monthly[i - 1].month).toBe(true);
    }
  });
});

describe("getBudgetUtilization", () => {
  it("calculates utilization correctly", () => {
    const u = getBudgetUtilization(60000);
    expect(u.spent).toBe(48000);
    expect(u.remaining).toBe(12000);
    expect(u.utilizationRate).toBeCloseTo(0.8);
    expect(u.isOver).toBe(false);
  });

  it("detects over-budget", () => {
    expect(getBudgetUtilization(40000).isOver).toBe(true);
  });

  it("returns 0 utilization for zero budget", () => {
    expect(getBudgetUtilization(0).utilizationRate).toBe(0);
  });
});
