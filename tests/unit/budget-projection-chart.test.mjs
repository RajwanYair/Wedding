/**
 * tests/unit/budget-projection-chart.test.mjs — Sprint 145 budget projection UI
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const _store = new Map();
vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: (k) => _store.get(k) ?? null,
  writeBrowserStorageJson: (k, v) => {
    _store.set(k, JSON.parse(JSON.stringify(v)));
  },
}));

beforeEach(() => {
  _store.clear();
});

const { buildBurndownSeries, projectOverrun, categoryBreakdown } = await import(
  "../../src/services/budget-burndown.js"
);

describe("BudgetProjectionChart (Sprint 145)", () => {
  describe("buildBurndownSeries", () => {
    it("returns empty array when no expenses", () => {
      expect(buildBurndownSeries(10000, [])).toEqual([]);
    });

    it("builds per-day cumulative series", () => {
      const expenses = [
        { amount: 500, paidAt: "2025-06-01" },
        { amount: 300, paidAt: "2025-06-01" },
        { amount: 200, paidAt: "2025-06-03" },
      ];
      const series = buildBurndownSeries(5000, expenses);
      expect(series).toHaveLength(2); // 2 distinct days
      expect(series[0]).toEqual({ date: "2025-06-01", spent: 800, remaining: 4200 });
      expect(series[1]).toEqual({ date: "2025-06-03", spent: 1000, remaining: 4000 });
    });

    it("ignores expenses with invalid amount", () => {
      const expenses = [
        { amount: 500, paidAt: "2025-06-01" },
        { amount: -100, paidAt: "2025-06-02" },
        { amount: 0, paidAt: "2025-06-02" },
      ];
      const series = buildBurndownSeries(5000, expenses);
      expect(series).toHaveLength(1);
    });
  });

  describe("projectOverrun", () => {
    it("returns zero projection when no expenses", () => {
      const result = projectOverrun(10000, [], "2025-12-31");
      expect(result.projectedSpend).toBe(0);
      expect(result.dailyBurn).toBe(0);
    });

    it("projects overrun when spending fast", () => {
      const now = new Date("2025-06-15");
      const expenses = [
        { amount: 5000, paidAt: "2025-06-01" },
        { amount: 3000, paidAt: "2025-06-10" },
      ];
      const result = projectOverrun(10000, expenses, "2025-12-31", now);
      expect(result.dailyBurn).toBeGreaterThan(0);
      expect(result.projectedSpend).toBeGreaterThan(8000);
    });

    it("projects no overrun for frugal spending", () => {
      const now = new Date("2025-06-15");
      const expenses = [{ amount: 100, paidAt: "2025-06-01" }];
      const result = projectOverrun(100000, expenses, "2025-12-31", now);
      expect(result.projectedOverrun).toBeLessThan(0);
    });
  });

  describe("categoryBreakdown", () => {
    it("returns empty array for no expenses", () => {
      expect(categoryBreakdown([])).toEqual([]);
    });

    it("groups and sorts by total descending", () => {
      const expenses = [
        { amount: 1000, paidAt: "2025-06-01", category: "venue" },
        { amount: 500, paidAt: "2025-06-02", category: "catering" },
        { amount: 800, paidAt: "2025-06-03", category: "venue" },
      ];
      const result = categoryBreakdown(expenses);
      expect(result).toHaveLength(2);
      expect(result[0].category).toBe("venue");
      expect(result[0].amount).toBe(1800);
      expect(result[1].category).toBe("catering");
    });

    it("uses 'uncategorised' for missing category", () => {
      const expenses = [{ amount: 200, paidAt: "2025-06-01" }];
      const result = categoryBreakdown(expenses);
      expect(result[0].category).toBe("uncategorised");
    });
  });
});
