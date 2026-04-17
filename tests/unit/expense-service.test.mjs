/**
 * tests/unit/expense-service.test.mjs — Unit tests for expense domain service (Sprint 27)
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeGet } from "../../src/core/store.js";
import { makeExpense } from "./helpers.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  addExpense,
  updateExpense,
  removeExpense,
  getBudgetUsed,
  getBudgetTotal,
  getBudgetRemaining,
  getOverBudget,
  getExpenseSummary,
  getExpensesByDateRange,
} = await import("../../src/services/expense-service.js");

function seed(expenses = [], budget = 0) {
  initStore({
    guests: { value: [] },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: expenses },
    timeline: { value: [] },
    timelineDone: { value: {} },
    rsvp_log: { value: [] },
    weddingInfo: { value: { budget } },
  });
}

// ── addExpense ─────────────────────────────────────────────────────────────

describe("addExpense", () => {
  beforeEach(() => seed());

  it("creates expense and stores it", async () => {
    await addExpense({ category: "food", description: "catering", amount: 1000 });
    expect(storeGet("expenses")).toHaveLength(1);
    expect(storeGet("expenses")[0].amount).toBe(1000);
  });

  it("defaults date to today", async () => {
    await addExpense({ category: "food", description: "test", amount: 100 });
    const today = new Date().toISOString().slice(0, 10);
    expect(storeGet("expenses")[0].date).toBe(today);
  });

  it("rejects negative amounts", async () => {
    await expect(addExpense({ category: "food", description: "bad", amount: -1 })).rejects.toThrow(
      "non-negative",
    );
  });
});

// ── updateExpense ─────────────────────────────────────────────────────────

describe("updateExpense", () => {
  beforeEach(() => seed([makeExpense({ id: "e1", amount: 200 })]));

  it("updates amount", async () => {
    await updateExpense("e1", { amount: 350 });
    expect(storeGet("expenses")[0].amount).toBe(350);
  });

  it("rejects negative amount", async () => {
    await expect(updateExpense("e1", { amount: -5 })).rejects.toThrow("non-negative");
  });
});

// ── removeExpense ─────────────────────────────────────────────────────────

describe("removeExpense", () => {
  beforeEach(() => seed([makeExpense({ id: "e1" }), makeExpense({ id: "e2" })]));

  it("removes the expense", async () => {
    await removeExpense("e1");
    expect(storeGet("expenses").some((e) => e.id === "e1")).toBe(false);
  });
});

// ── getBudgetUsed ─────────────────────────────────────────────────────────

describe("getBudgetUsed", () => {
  it("sums all expense amounts", async () => {
    seed([makeExpense({ amount: 400 }), makeExpense({ amount: 600 })]);
    expect(await getBudgetUsed()).toBe(1000);
  });

  it("returns 0 with no expenses", async () => {
    seed([]);
    expect(await getBudgetUsed()).toBe(0);
  });
});

// ── getBudgetTotal ─────────────────────────────────────────────────────────

describe("getBudgetTotal", () => {
  it("reads from weddingInfo.budget", () => {
    seed([], 50000);
    expect(getBudgetTotal()).toBe(50000);
  });

  it("returns 0 if not set", () => {
    seed([], 0);
    expect(getBudgetTotal()).toBe(0);
  });
});

// ── getBudgetRemaining ────────────────────────────────────────────────────

describe("getBudgetRemaining", () => {
  it("calculates remaining budget", async () => {
    seed([makeExpense({ amount: 3000 })], 10000);
    expect(await getBudgetRemaining()).toBe(7000);
  });

  it("returns negative when over budget", async () => {
    seed([makeExpense({ amount: 12000 })], 10000);
    expect(await getBudgetRemaining()).toBe(-2000);
  });
});

// ── getOverBudget ─────────────────────────────────────────────────────────

describe("getOverBudget", () => {
  beforeEach(() =>
    seed([
      makeExpense({ category: "food", amount: 6000 }),
      makeExpense({ category: "food", amount: 2000 }),
      makeExpense({ category: "venue", amount: 3000 }),
    ]),
  );

  it("returns categories over their limit", async () => {
    const r = await getOverBudget({ food: 5000, venue: 10000 });
    expect(r.some((x) => x.category === "food")).toBe(true);
    expect(r.some((x) => x.category === "venue")).toBe(false);
  });

  it("calculates over amount", async () => {
    const r = await getOverBudget({ food: 5000 });
    expect(r[0].over).toBe(3000);
  });
});

// ── getExpenseSummary ─────────────────────────────────────────────────────

describe("getExpenseSummary", () => {
  beforeEach(() =>
    seed([
      makeExpense({ category: "food", amount: 1000 }),
      makeExpense({ category: "food", amount: 500 }),
      makeExpense({ category: "music", amount: 2000 }),
    ]),
  );

  it("totals all expenses", async () => {
    const s = await getExpenseSummary();
    expect(s.total).toBe(3500);
    expect(s.count).toBe(3);
  });

  it("breaks down byCategory", async () => {
    const s = await getExpenseSummary();
    expect(s.byCategory.food.count).toBe(2);
    expect(s.byCategory.food.total).toBe(1500);
    expect(s.byCategory.music.total).toBe(2000);
  });
});

// ── getExpensesByDateRange ─────────────────────────────────────────────────

describe("getExpensesByDateRange", () => {
  beforeEach(() =>
    seed([
      makeExpense({ id: "e1", date: "2024-03-01", amount: 100 }),
      makeExpense({ id: "e2", date: "2024-06-15", amount: 200 }),
      makeExpense({ id: "e3", date: "2024-12-31", amount: 300 }),
    ]),
  );

  it("returns expenses within range (inclusive)", async () => {
    const r = await getExpensesByDateRange("2024-03-01", "2024-06-15");
    expect(r.map((e) => e.id)).toContain("e1");
    expect(r.map((e) => e.id)).toContain("e2");
    expect(r.map((e) => e.id)).not.toContain("e3");
  });

  it("returns empty for out-of-range", async () => {
    expect(await getExpensesByDateRange("2025-01-01", "2025-12-31")).toHaveLength(0);
  });
});
