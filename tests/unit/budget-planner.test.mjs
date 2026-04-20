import { describe, it, expect } from "vitest";
import {
  BUDGET_CATEGORIES,
  buildDefaultBudgetPlan,
  createBudgetLine,
  summarizeBudget,
  getOverBudgetLines,
  computeVariances,
  reallocateSurplus,
  formatBudgetAmount,
  budgetLineStatus,
  sortByVariance,
} from "../../src/utils/budget-planner.js";

// ── BUDGET_CATEGORIES ─────────────────────────────────────────────────────

describe("BUDGET_CATEGORIES", () => {
  it("is frozen", () => expect(Object.isFrozen(BUDGET_CATEGORIES)).toBe(true));
  it("contains venue", () => expect(BUDGET_CATEGORIES.venue).toBeDefined());
  it("percentages sum to 100", () => {
    const total = Object.values(BUDGET_CATEGORIES).reduce(
      (s, c) => s + c.defaultPct,
      0,
    );
    expect(total).toBe(100);
  });
  it("each category has label and defaultPct", () => {
    for (const cat of Object.values(BUDGET_CATEGORIES)) {
      expect(typeof cat.label).toBe("string");
      expect(typeof cat.defaultPct).toBe("number");
    }
  });
});

// ── buildDefaultBudgetPlan ────────────────────────────────────────────────

describe("buildDefaultBudgetPlan()", () => {
  it("returns empty for 0", () =>
    expect(buildDefaultBudgetPlan(0)).toEqual([]));
  it("returns empty for negative", () =>
    expect(buildDefaultBudgetPlan(-100)).toEqual([]));
  it("returns empty for non-number", () =>
    expect(buildDefaultBudgetPlan("10000")).toEqual([]));
  it("produces one line per category", () => {
    const plan = buildDefaultBudgetPlan(100000);
    expect(plan).toHaveLength(Object.keys(BUDGET_CATEGORIES).length);
  });
  it("allocated amounts sum close to totalBudget", () => {
    const plan = buildDefaultBudgetPlan(100000);
    const total = plan.reduce((s, l) => s + l.allocated, 0);
    expect(total).toBeGreaterThan(99000);
    expect(total).toBeLessThanOrEqual(100000);
  });
  it("all lines start with spent = 0", () => {
    const plan = buildDefaultBudgetPlan(50000);
    expect(plan.every((l) => l.spent === 0)).toBe(true);
  });
});

// ── createBudgetLine ──────────────────────────────────────────────────────

describe("createBudgetLine()", () => {
  it("returns null for missing category", () =>
    expect(createBudgetLine("", 1000)).toBeNull());
  it("returns null for non-number allocated", () =>
    expect(createBudgetLine("venue", "bad")).toBeNull());
  it("creates a valid line", () => {
    const line = createBudgetLine("venue", 5000, 2000);
    expect(line.allocated).toBe(5000);
    expect(line.spent).toBe(2000);
    expect(line.remaining).toBe(3000);
  });
  it("defaults spent to 0", () => {
    const line = createBudgetLine("photography", 3000);
    expect(line.spent).toBe(0);
    expect(line.remaining).toBe(3000);
  });
  it("uses category key as label for unknown category", () => {
    const line = createBudgetLine("custom_thing", 1000);
    expect(line.label).toBe("custom_thing");
  });
});

// ── summarizeBudget ───────────────────────────────────────────────────────

describe("summarizeBudget()", () => {
  it("returns zeros for empty", () => {
    const s = summarizeBudget([]);
    expect(s.totalAllocated).toBe(0);
    expect(s.isOverBudget).toBe(false);
  });
  it("calculates totals correctly", () => {
    const lines = [
      { allocated: 5000, spent: 4000 },
      { allocated: 3000, spent: 3500 },
    ];
    const s = summarizeBudget(lines);
    expect(s.totalAllocated).toBe(8000);
    expect(s.totalSpent).toBe(7500);
    expect(s.totalRemaining).toBe(500);
    expect(s.isOverBudget).toBe(false);
  });
  it("sets isOverBudget when spent > allocated", () => {
    const s = summarizeBudget([{ allocated: 1000, spent: 1200 }]);
    expect(s.isOverBudget).toBe(true);
  });
  it("calculates utilizationRate", () => {
    const s = summarizeBudget([{ allocated: 1000, spent: 500 }]);
    expect(s.utilizationRate).toBe(0.5);
  });
});

// ── getOverBudgetLines ────────────────────────────────────────────────────

describe("getOverBudgetLines()", () => {
  it("returns empty for null", () =>
    expect(getOverBudgetLines(null)).toEqual([]));
  it("returns lines where spent > allocated", () => {
    const lines = [
      { category: "venue", allocated: 5000, spent: 6000 },
      { category: "music", allocated: 3000, spent: 2500 },
    ];
    const over = getOverBudgetLines(lines);
    expect(over).toHaveLength(1);
    expect(over[0].category).toBe("venue");
  });
});

// ── computeVariances ──────────────────────────────────────────────────────

describe("computeVariances()", () => {
  it("returns empty for null", () =>
    expect(computeVariances(null)).toEqual([]));
  it("positive variance = over budget", () => {
    const v = computeVariances([
      { category: "venue", allocated: 5000, spent: 6000 },
    ]);
    expect(v[0].variance).toBe(1000);
  });
  it("negative variance = under budget", () => {
    const v = computeVariances([
      { category: "music", allocated: 3000, spent: 2000 },
    ]);
    expect(v[0].variance).toBe(-1000);
  });
  it("computes variancePct", () => {
    const v = computeVariances([
      { category: "venue", allocated: 10000, spent: 11000 },
    ]);
    expect(v[0].variancePct).toBeCloseTo(0.1);
  });
});

// ── reallocateSurplus ─────────────────────────────────────────────────────

describe("reallocateSurplus()", () => {
  it("returns original for null", () =>
    expect(reallocateSurplus(null, "venue")).toEqual([]));
  it("returns original for missing target", () => {
    const lines = [{ category: "venue", allocated: 5000, spent: 3000 }];
    expect(reallocateSurplus(lines, "")).toEqual(lines);
  });
  it("increases target allocation by surplus", () => {
    const lines = [
      { category: "music", allocated: 3000, spent: 2000 },
      { category: "venue", allocated: 5000, spent: 5000 },
    ];
    const result = reallocateSurplus(lines, "venue");
    const venue = result.find((l) => l.category === "venue");
    expect(venue.allocated).toBe(6000); // 5000 + 1000 surplus from music
  });
});

// ── formatBudgetAmount ────────────────────────────────────────────────────

describe("formatBudgetAmount()", () => {
  it("returns empty for non-number", () =>
    expect(formatBudgetAmount("bad")).toBe(""));
  it("returns formatted string for valid amount", () => {
    const result = formatBudgetAmount(1000, "USD", "en-US");
    expect(result).toContain("1,000");
  });
  it("handles 0", () => {
    const result = formatBudgetAmount(0, "USD", "en-US");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

// ── budgetLineStatus ──────────────────────────────────────────────────────

describe("budgetLineStatus()", () => {
  it("green when under 80%", () =>
    expect(budgetLineStatus({ allocated: 1000, spent: 700 })).toBe("green"));
  it("amber when 80-100%", () =>
    expect(budgetLineStatus({ allocated: 1000, spent: 900 })).toBe("amber"));
  it("red when over 100%", () =>
    expect(budgetLineStatus({ allocated: 1000, spent: 1100 })).toBe("red"));
  it("green for null", () => expect(budgetLineStatus(null)).toBe("green"));
  it("green when allocated is 0", () =>
    expect(budgetLineStatus({ allocated: 0, spent: 0 })).toBe("green"));
});

// ── sortByVariance ────────────────────────────────────────────────────────

describe("sortByVariance()", () => {
  it("returns empty for null", () => expect(sortByVariance(null)).toEqual([]));
  it("sorts most over-budget first", () => {
    const lines = [
      { category: "music", allocated: 3000, spent: 2500 },
      { category: "venue", allocated: 5000, spent: 6000 },
      { category: "flowers", allocated: 2000, spent: 2000 },
    ];
    const sorted = sortByVariance(lines);
    expect(sorted[0].category).toBe("venue");
  });
  it("does not mutate input", () => {
    const lines = [{ category: "a", allocated: 1000, spent: 500 }];
    sortByVariance(lines);
    expect(lines).toHaveLength(1);
  });
});
