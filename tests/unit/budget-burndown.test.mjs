/**
 * tests/unit/budget-burndown.test.mjs — Sprint 29
 *
 * Tests for src/utils/budget-burndown.js — computeBudgetBurndown,
 * sliceBurndownUpTo, projectFinalSpend.
 */

import { describe, it, expect } from "vitest";
import {
  computeBudgetBurndown,
  sliceBurndownUpTo,
  projectFinalSpend,
} from "../../src/utils/budget-burndown.js";

// ── computeBudgetBurndown ──────────────────────────────────────────────

describe("computeBudgetBurndown()", () => {
  it("returns empty points and zero totals for empty expense list", () => {
    const r = computeBudgetBurndown([], 50000);
    expect(r.points).toEqual([]);
    expect(r.totalSpend).toBe(0);
    expect(r.remaining).toBe(50000);
    expect(r.pct).toBe(0);
    expect(r.overBudget).toBe(false);
  });

  it("handles zero total budget without dividing by zero", () => {
    const r = computeBudgetBurndown([{ date: "2024-01-01", amount: 100 }], 0);
    expect(r.pct).toBe(0);
    expect(r.overBudget).toBe(true);
  });

  it("produces one point per unique date", () => {
    const expenses = [
      { date: "2024-01-01", amount: 100 },
      { date: "2024-01-02", amount: 200 },
      { date: "2024-01-02", amount: 50 },
    ];
    const r = computeBudgetBurndown(expenses, 1000);
    expect(r.points).toHaveLength(2);
  });

  it("accumulates spend correctly across days", () => {
    const expenses = [
      { date: "2024-01-01", amount: 100 },
      { date: "2024-01-02", amount: 200 },
    ];
    const r = computeBudgetBurndown(expenses, 1000);
    expect(r.points[0].cumulative).toBe(100);
    expect(r.points[1].cumulative).toBe(300);
    expect(r.points[1].spend).toBe(200);
  });

  it("groups multiple expenses on the same day", () => {
    const expenses = [
      { date: "2024-03-15", amount: 500 },
      { date: "2024-03-15", amount: 300 },
    ];
    const r = computeBudgetBurndown(expenses, 5000);
    expect(r.points).toHaveLength(1);
    expect(r.points[0].spend).toBe(800);
  });

  it("sorts points chronologically regardless of input order", () => {
    const expenses = [
      { date: "2024-06-03", amount: 100 },
      { date: "2024-06-01", amount: 200 },
      { date: "2024-06-02", amount: 150 },
    ];
    const r = computeBudgetBurndown(expenses, 1000);
    expect(r.points[0].date).toBe("2024-06-01");
    expect(r.points[1].date).toBe("2024-06-02");
    expect(r.points[2].date).toBe("2024-06-03");
  });

  it("calculates remaining and pct correctly", () => {
    const expenses = [{ date: "2024-01-01", amount: 250 }];
    const r = computeBudgetBurndown(expenses, 1000);
    expect(r.points[0].remaining).toBe(750);
    expect(r.points[0].pct).toBe(25);
  });

  it("sets overBudget true when spend exceeds budget", () => {
    const expenses = [{ date: "2024-01-01", amount: 1500 }];
    const r = computeBudgetBurndown(expenses, 1000);
    expect(r.overBudget).toBe(true);
    expect(r.remaining).toBe(-500);
  });

  it("ignores expenses with missing or invalid dates", () => {
    const expenses = [
      { date: null,        amount: 999 },
      { date: "",          amount: 999 },
      { date: "not-a-date", amount: 999 },
      { date: "2024-05-01", amount: 100 },
    ];
    const r = computeBudgetBurndown(expenses, 1000);
    expect(r.points).toHaveLength(1);
    expect(r.totalSpend).toBe(100);
  });

  it("ignores negative or non-numeric amounts", () => {
    const expenses = [
      { date: "2024-01-01", amount: -100 },
      { date: "2024-01-01", amount: "abc" },
      { date: "2024-01-01", amount: 200 },
    ];
    const r = computeBudgetBurndown(expenses, 1000);
    expect(r.totalSpend).toBe(200);
  });

  it("handles totalBudget = NaN gracefully (defaults to 0)", () => {
    const r = computeBudgetBurndown([], NaN);
    expect(r.totalBudget).toBe(0);
  });
});

// ── sliceBurndownUpTo ──────────────────────────────────────────────────

describe("sliceBurndownUpTo()", () => {
  const points = [
    { date: "2024-01-01", spend: 100, cumulative: 100,  remaining: 900, pct: 10 },
    { date: "2024-01-15", spend: 200, cumulative: 300,  remaining: 700, pct: 30 },
    { date: "2024-02-01", spend: 400, cumulative: 700,  remaining: 300, pct: 70 },
  ];

  it("returns all points when untilDate is after all", () => {
    expect(sliceBurndownUpTo(points, "2024-12-31")).toHaveLength(3);
  });

  it("returns empty array when untilDate is before all", () => {
    expect(sliceBurndownUpTo(points, "2023-12-31")).toHaveLength(0);
  });

  it("includes the exact date match", () => {
    const sliced = sliceBurndownUpTo(points, "2024-01-15");
    expect(sliced).toHaveLength(2);
    expect(sliced[1].date).toBe("2024-01-15");
  });

  it("returns empty array for empty points", () => {
    expect(sliceBurndownUpTo([], "2024-06-01")).toEqual([]);
  });
});

// ── projectFinalSpend ──────────────────────────────────────────────────

describe("projectFinalSpend()", () => {
  const points = [
    { date: "2024-01-01", spend: 100, cumulative: 100,  remaining: 900, pct: 10 },
    { date: "2024-01-02", spend: 200, cumulative: 300,  remaining: 700, pct: 30 },
  ];

  it("returns 0 for empty points", () => {
    expect(projectFinalSpend([], 30)).toBe(0);
  });

  it("returns 0 when totalDays is 0", () => {
    expect(projectFinalSpend(points, 0)).toBe(0);
  });

  it("returns 0 when totalDays is negative", () => {
    expect(projectFinalSpend(points, -5)).toBe(0);
  });

  it("projects correctly from daily average", () => {
    // cumulative after 2 days = 300; daily avg = 150; over 10 days → 1500
    expect(projectFinalSpend(points, 10)).toBe(1500);
  });
});
