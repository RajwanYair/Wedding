/**
 * tests/unit/budget-projection.test.mjs — S124 budget burn-down.
 */
import { describe, it, expect } from "vitest";
import {
  buildBurndownSeries,
  projectOverrun,
  categoryBreakdown,
} from "../../src/services/budget-projection.js";

const exp = [
  { amount: 1000, paidAt: "2026-04-01T08:00:00Z", category: "venue" },
  { amount: 500,  paidAt: "2026-04-01T17:00:00Z", category: "venue" },
  { amount: 800,  paidAt: "2026-04-05T10:00:00Z", category: "catering" },
  { amount: 300,  paidAt: "2026-04-10T10:00:00Z", category: "flowers" },
];

describe("S124 — budget-projection", () => {
  it("buildBurndownSeries accumulates daily and tracks remaining", () => {
    const out = buildBurndownSeries(5000, exp);
    expect(out).toEqual([
      { date: "2026-04-01", spent: 1500, remaining: 3500 },
      { date: "2026-04-05", spent: 2300, remaining: 2700 },
      { date: "2026-04-10", spent: 2600, remaining: 2400 },
    ]);
  });

  it("buildBurndownSeries with empty expenses returns []", () => {
    expect(buildBurndownSeries(1000, [])).toEqual([]);
  });

  it("projectOverrun extrapolates daily burn to event date", () => {
    const now = new Date("2026-04-10T12:00:00Z");
    const r = projectOverrun(5000, exp, "2026-05-10T12:00:00Z", now);
    // 9 days elapsed, 2600 spent → ~289/day, 30 days remaining → ~8666 projected
    expect(r.dailyBurn).toBeGreaterThan(0);
    expect(r.projectedSpend).toBeGreaterThan(2600);
    expect(r.projectedOverrun).toBeGreaterThan(0); // overrun expected
  });

  it("projectOverrun reports -budget when no expenses yet", () => {
    const r = projectOverrun(5000, [], "2026-05-10", new Date("2026-04-01"));
    expect(r).toEqual({ projectedSpend: 0, projectedOverrun: -5000, dailyBurn: 0 });
  });

  it("categoryBreakdown sums and sorts desc", () => {
    expect(categoryBreakdown(exp)).toEqual([
      { category: "venue", amount: 1500 },
      { category: "catering", amount: 800 },
      { category: "flowers", amount: 300 },
    ]);
  });

  it("categoryBreakdown labels missing category as uncategorised", () => {
    expect(
      categoryBreakdown([{ amount: 50, paidAt: "2026-04-01" }])[0].category,
    ).toBe("uncategorised");
  });
});
