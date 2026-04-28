/**
 * tests/unit/budget-tracker.test.mjs — Sprint 115
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  createEnvelope, recordSpend, getEnvelopeSummary,
  getAllSummaries, getTotalBudget, getOverBudgetCategories,
} = await import("../../src/services/budget-burndown.js");

function seed() {
  initStore({
    budgetEnvelopes: { value: {} },
    guests:          { value: [] },
    weddingInfo:     { value: {} },
  });
}

beforeEach(seed);

describe("createEnvelope", () => {
  it("creates an envelope", () => {
    createEnvelope({ category: "venue", limit: 50_000 });
    expect(getEnvelopeSummary("venue")).toBeTruthy();
  });

  it("throws for empty category", () => {
    expect(() => createEnvelope({ category: "", limit: 1000 })).toThrow("category");
  });

  it("throws for negative limit", () => {
    expect(() => createEnvelope({ category: "x", limit: -1 })).toThrow("limit");
  });
});

describe("recordSpend", () => {
  it("increases spent", () => {
    createEnvelope({ category: "food", limit: 10_000 });
    recordSpend("food", 3_000);
    expect(getEnvelopeSummary("food")?.spent).toBe(3_000);
  });

  it("accumulates multiple spends", () => {
    createEnvelope({ category: "food", limit: 10_000 });
    recordSpend("food", 2_000);
    recordSpend("food", 1_500);
    expect(getEnvelopeSummary("food")?.spent).toBe(3_500);
  });

  it("returns false for unknown category", () => {
    expect(recordSpend("unknown", 100)).toBe(false);
  });

  it("throws for zero or negative amount", () => {
    createEnvelope({ category: "x", limit: 1000 });
    expect(() => recordSpend("x", 0)).toThrow("amount");
  });
});

describe("getEnvelopeSummary", () => {
  it("returns remaining = limit - spent", () => {
    createEnvelope({ category: "dj", limit: 8_000 });
    recordSpend("dj", 3_000);
    const s = getEnvelopeSummary("dj");
    expect(s?.remaining).toBe(5_000);
  });

  it("isOver is true when over budget", () => {
    createEnvelope({ category: "flowers", limit: 1_000 });
    recordSpend("flowers", 1_500);
    expect(getEnvelopeSummary("flowers")?.isOver).toBe(true);
  });

  it("returns null for unknown category", () => {
    expect(getEnvelopeSummary("unknown")).toBeNull();
  });
});

describe("getTotalBudget", () => {
  it("aggregates across envelopes", () => {
    createEnvelope({ category: "a", limit: 5_000 });
    createEnvelope({ category: "b", limit: 3_000 });
    recordSpend("a", 2_000);
    const t = getTotalBudget();
    expect(t.totalLimit).toBe(8_000);
    expect(t.totalSpent).toBe(2_000);
    expect(t.totalRemaining).toBe(6_000);
  });
});

describe("getOverBudgetCategories", () => {
  it("returns over-budget categories", () => {
    createEnvelope({ category: "cake", limit: 500 });
    recordSpend("cake", 600);
    expect(getOverBudgetCategories()).toContain("cake");
  });

  it("excludes in-budget categories", () => {
    createEnvelope({ category: "flowers", limit: 1000 });
    recordSpend("flowers", 500);
    expect(getOverBudgetCategories()).not.toContain("flowers");
  });
});

describe("getAllSummaries", () => {
  it("returns one entry per envelope", () => {
    createEnvelope({ category: "x", limit: 100 });
    createEnvelope({ category: "y", limit: 200 });
    const s = getAllSummaries();
    expect(Object.keys(s)).toHaveLength(2);
  });
});
