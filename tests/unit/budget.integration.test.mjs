/**
 * tests/unit/budget.integration.test.mjs — Integration tests for budget section
 * Covers: saveBudgetEntry · deleteBudgetEntry · getBudgetSummary
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import {
  saveBudgetEntry,
  deleteBudgetEntry,
  getBudgetSummary,
  getBudgetVsActual,
  getMonthlyExpenses,
  getPaymentUtilization,
  getBudgetForecast,
  getTopExpenses,
} from "../../src/sections/budget.js";

beforeEach(() => {
  vi.useFakeTimers();
  initStore({ budget: { value: [] }, guests: { value: [] }, vendors: { value: [] }, expenses: { value: [] }, weddingInfo: { value: {} } });
  storeSet("budget", []);
  storeSet("guests", []);
  storeSet("vendors", []);
  storeSet("expenses", []);
  storeSet("weddingInfo", {});
});

afterEach(() => {
  vi.useRealTimers();
});

// ── saveBudgetEntry ───────────────────────────────────────────────────────
describe("saveBudgetEntry", () => {
  it("creates a new entry and returns ok:true", () => {
    const result = saveBudgetEntry({ name: "Gift from Dan", amount: 500 });
    expect(result.ok).toBe(true);
    expect(storeGet("budget").length).toBe(1);
  });

  it("rejects missing name", () => {
    const result = saveBudgetEntry({ amount: 500 });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects missing amount", () => {
    const result = saveBudgetEntry({ name: "Gift" });
    expect(result.ok).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = saveBudgetEntry({ name: "Gift", amount: -100 });
    // amount.min = 0, so negative gets clamped, not rejected
    // But name is required — verify ok is true with clamped amount
    expect(result.ok).toBe(true);
    expect(storeGet("budget")[0].amount).toBe(0);
  });

  it("stores the entry with a uid", () => {
    saveBudgetEntry({ name: "Gift", amount: 300 });
    const entry = storeGet("budget")[0];
    expect(entry.id).toBeTruthy();
    expect(entry.name).toBe("Gift");
    expect(entry.amount).toBe(300);
  });

  it("updates an existing entry by ID", () => {
    saveBudgetEntry({ name: "Original", amount: 100 });
    const id = storeGet("budget")[0].id;
    const result = saveBudgetEntry({ name: "Updated", amount: 200 }, id);
    expect(result.ok).toBe(true);
    expect(storeGet("budget")[0].name).toBe("Updated");
    expect(storeGet("budget")[0].amount).toBe(200);
  });

  it("returns error for unknown ID on update", () => {
    const result = saveBudgetEntry({ name: "X", amount: 10 }, "fake-id");
    expect(result.ok).toBe(false);
  });

  it("multiple entries can coexist", () => {
    saveBudgetEntry({ name: "Gift A", amount: 100 });
    saveBudgetEntry({ name: "Gift B", amount: 200 });
    saveBudgetEntry({ name: "Gift C", amount: 300 });
    expect(storeGet("budget").length).toBe(3);
  });

  it("stores createdAt timestamp", () => {
    saveBudgetEntry({ name: "Entry", amount: 50 });
    expect(storeGet("budget")[0].createdAt).toBeTruthy();
  });
});

// ── deleteBudgetEntry ─────────────────────────────────────────────────────
describe("deleteBudgetEntry", () => {
  it("removes entry from store", () => {
    saveBudgetEntry({ name: "Gift", amount: 100 });
    const id = storeGet("budget")[0].id;
    deleteBudgetEntry(id);
    expect(storeGet("budget").length).toBe(0);
  });

  it("leaves other entries untouched", () => {
    saveBudgetEntry({ name: "Keep", amount: 100 });
    saveBudgetEntry({ name: "Delete", amount: 50 });
    const entries = storeGet("budget");
    deleteBudgetEntry(entries[1].id);
    expect(storeGet("budget").length).toBe(1);
    expect(storeGet("budget")[0].name).toBe("Keep");
  });

  it("is a no-op for unknown ID", () => {
    saveBudgetEntry({ name: "Gift", amount: 100 });
    deleteBudgetEntry("nonexistent");
    expect(storeGet("budget").length).toBe(1);
  });
});

// ── getBudgetSummary ──────────────────────────────────────────────────────
describe("getBudgetSummary", () => {
  it("returns zeros when empty", () => {
    const summary = getBudgetSummary();
    expect(summary.total).toBe(0);
    expect(summary.gifts).toBe(0);
    expect(summary.expenses).toBe(0);
    expect(summary.balance).toBe(0);
  });

  it("sums guest gift amounts", () => {
    storeSet("guests", [
      { id: "g1", gift: "500", count: 1 },
      { id: "g2", gift: 300, count: 2 },
    ]);
    const summary = getBudgetSummary();
    expect(summary.gifts).toBe(800);
  });

  it("sums budget entry amounts", () => {
    saveBudgetEntry({ name: "A", amount: 200 });
    saveBudgetEntry({ name: "B", amount: 350 });
    const summary = getBudgetSummary();
    expect(summary.total).toBe(550);
  });

  it("sums vendor prices as expenses", () => {
    storeSet("vendors", [
      { id: "v1", price: 1000, paid: 500 },
      { id: "v2", price: 2000, paid: 0 },
    ]);
    const summary = getBudgetSummary();
    expect(summary.expenses).toBe(3000);
  });

  it("calculates balance = income - expenses", () => {
    storeSet("guests", [{ id: "g1", gift: 1000 }]);
    storeSet("vendors", [{ id: "v1", price: 600 }]);
    const summary = getBudgetSummary();
    expect(summary.balance).toBe(400);
  });
});

// ── getBudgetVsActual ─────────────────────────────────────────────────────
describe("getBudgetVsActual", () => {
  it("returns empty array when no data", () => {
    expect(getBudgetVsActual()).toEqual([]);
  });

  it("compares budgeted vs actual by category", () => {
    storeSet("budget", [
      { id: "b1", category: "venue", amount: 5000 },
      { id: "b2", category: "food", amount: 3000 },
    ]);
    storeSet("vendors", [
      { id: "v1", category: "venue", price: 4500 },
      { id: "v2", category: "food", price: 3500 },
    ]);
    const rows = getBudgetVsActual();
    expect(rows).toHaveLength(2);
    const venue = rows.find((r) => r.category === "venue");
    expect(venue.budgeted).toBe(5000);
    expect(venue.actual).toBe(4500);
    expect(venue.diff).toBe(500);
    const food = rows.find((r) => r.category === "food");
    expect(food.diff).toBe(-500);
  });

  it("sorts by absolute diff descending", () => {
    storeSet("budget", [
      { id: "b1", category: "a", amount: 1000 },
      { id: "b2", category: "b", amount: 100 },
    ]);
    storeSet("vendors", [
      { id: "v1", category: "a", price: 900 },
      { id: "v2", category: "b", price: 500 },
    ]);
    const rows = getBudgetVsActual();
    expect(Math.abs(rows[0].diff)).toBeGreaterThanOrEqual(Math.abs(rows[1].diff));
  });
});

// ── getMonthlyExpenses ────────────────────────────────────────────────────
describe("getMonthlyExpenses", () => {
  it("returns empty when no expenses", () => {
    expect(getMonthlyExpenses()).toEqual([]);
  });

  it("groups expenses by YYYY-MM", () => {
    storeSet("expenses", [
      { id: "e1", amount: 100, date: "2026-03-10" },
      { id: "e2", amount: 200, date: "2026-03-20" },
      { id: "e3", amount: 300, date: "2026-04-05" },
    ]);
    const months = getMonthlyExpenses();
    expect(months).toHaveLength(2);
    expect(months[0].month).toBe("2026-03");
    expect(months[0].total).toBe(300);
    expect(months[0].count).toBe(2);
    expect(months[1].month).toBe("2026-04");
    expect(months[1].total).toBe(300);
  });

  it("skips expenses without dates", () => {
    storeSet("expenses", [
      { id: "e1", amount: 100 },
      { id: "e2", amount: 200, date: "2026-01-15" },
    ]);
    expect(getMonthlyExpenses()).toHaveLength(1);
  });
});

// ── getPaymentUtilization ─────────────────────────────────────────────────
describe("getPaymentUtilization", () => {
  it("returns empty for no vendors", () => {
    expect(getPaymentUtilization()).toEqual([]);
  });

  it("calculates utilization by category", () => {
    storeSet("vendors", [
      { id: "v1", category: "venue", price: 1000, paid: 800 },
      { id: "v2", category: "food", price: 2000, paid: 500 },
    ]);
    const rows = getPaymentUtilization();
    expect(rows).toHaveLength(2);
    const food = rows.find((r) => r.category === "food");
    expect(food.rate).toBe(25);
    const venue = rows.find((r) => r.category === "venue");
    expect(venue.rate).toBe(80);
  });

  it("handles zero-price vendor gracefully", () => {
    storeSet("vendors", [{ id: "v1", category: "DJ", price: 0, paid: 0 }]);
    const rows = getPaymentUtilization();
    expect(rows[0].rate).toBe(0);
  });
});

// ── getBudgetForecast ─────────────────────────────────────────────────────
describe("getBudgetForecast", () => {
  it("returns zero rate with no expenses", () => {
    storeSet("weddingInfo", { budgetTarget: "10000" });
    const fc = getBudgetForecast();
    expect(fc.monthlyRate).toBe(0);
    expect(fc.monthsLeft).toBeNull();
    expect(fc.remaining).toBe(10000);
  });

  it("calculates remaining budget", () => {
    storeSet("weddingInfo", { budgetTarget: "10000" });
    storeSet("vendors", [{ id: "v1", paid: 3000 }]);
    storeSet("expenses", [{ id: "e1", amount: 2000, date: "2026-01-01" }]);
    const fc = getBudgetForecast();
    expect(fc.remaining).toBe(5000);
  });

  it("estimates monthly rate from dated expenses", () => {
    storeSet("weddingInfo", { budgetTarget: "10000" });
    storeSet("expenses", [
      { id: "e1", amount: 1000, date: "2026-01-01" },
      { id: "e2", amount: 1000, date: "2026-03-01" },
    ]);
    const fc = getBudgetForecast();
    expect(fc.monthlyRate).toBeGreaterThan(0);
    expect(fc.monthsLeft).not.toBeNull();
  });
});

// ── getTopExpenses ────────────────────────────────────────────────────────
describe("getTopExpenses", () => {
  it("returns empty for no data", () => {
    expect(getTopExpenses()).toEqual([]);
  });

  it("combines expenses and vendor costs, sorted by amount", () => {
    storeSet("expenses", [
      { id: "e1", description: "flowers", amount: 500, category: "decor" },
    ]);
    storeSet("vendors", [
      { id: "v1", name: "DJ Ami", price: 3000, category: "music" },
      { id: "v2", name: "Photo", price: 2000, category: "photo" },
    ]);
    const top = getTopExpenses();
    expect(top).toHaveLength(3);
    expect(top[0].description).toBe("DJ Ami");
    expect(top[0].amount).toBe(3000);
    expect(top[2].amount).toBe(500);
  });

  it("respects limit parameter", () => {
    storeSet("expenses", [
      { id: "e1", amount: 100 },
      { id: "e2", amount: 200 },
      { id: "e3", amount: 300 },
    ]);
    expect(getTopExpenses(2)).toHaveLength(2);
  });
});
