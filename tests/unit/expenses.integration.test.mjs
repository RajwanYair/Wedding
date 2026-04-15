/**
 * tests/unit/expenses.integration.test.mjs — Integration tests for expenses section
 * Covers: saveExpense · deleteExpense · getExpenseSummary
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import {
  saveExpense,
  deleteExpense,
  getExpenseSummary,
} from "../../src/sections/expenses.js";

beforeEach(() => {
  vi.useFakeTimers();
  initStore({ expenses: { value: [] } });
  storeSet("expenses", []);
});

afterEach(() => {
  vi.useRealTimers();
});

function makeExpense(overrides = {}) {
  return {
    category: "Catering",
    description: "Wedding dinner",
    amount: 10000,
    date: "2024-06-01",
    ...overrides,
  };
}

// ── saveExpense ───────────────────────────────────────────────────────────────

describe("saveExpense", () => {
  it("creates a new expense and returns ok:true", () => {
    const result = saveExpense(makeExpense());
    expect(result.ok).toBe(true);
    expect(storeGet("expenses").length).toBe(1);
  });

  it("rejects missing category", () => {
    const result = saveExpense({ description: "Test", amount: 100 });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects missing description", () => {
    const result = saveExpense({ category: "Catering", amount: 100 });
    expect(result.ok).toBe(false);
  });

  it("stores amount as number", () => {
    saveExpense(makeExpense({ amount: 1500 }));
    expect(storeGet("expenses")[0].amount).toBe(1500);
  });

  it("assigns a unique id to each expense", () => {
    saveExpense(makeExpense());
    saveExpense(makeExpense({ description: "Flowers" }));
    const ids = storeGet("expenses").map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("updates an existing expense by id", () => {
    saveExpense(makeExpense({ amount: 500 }));
    const id = storeGet("expenses")[0].id;
    saveExpense({ ...makeExpense(), amount: 750 }, id);
    expect(storeGet("expenses")[0].amount).toBe(750);
    expect(storeGet("expenses").length).toBe(1);
  });

  it("rejects update for non-existent id", () => {
    const result = saveExpense(makeExpense(), "nonexistent");
    expect(result.ok).toBe(false);
  });
});

// ── deleteExpense ─────────────────────────────────────────────────────────────

describe("deleteExpense", () => {
  it("removes the expense from the store", () => {
    saveExpense(makeExpense());
    const id = storeGet("expenses")[0].id;
    deleteExpense(id);
    expect(storeGet("expenses").length).toBe(0);
  });

  it("does not affect other expenses", () => {
    saveExpense(makeExpense());
    saveExpense(makeExpense({ description: "Florist" }));
    const id = storeGet("expenses")[0].id;
    deleteExpense(id);
    expect(storeGet("expenses").length).toBe(1);
  });

  it("is safe to call with unknown id", () => {
    saveExpense(makeExpense());
    deleteExpense("nonexistent");
    expect(storeGet("expenses").length).toBe(1);
  });
});

// ── getExpenseSummary ─────────────────────────────────────────────────────────

describe("getExpenseSummary", () => {
  it("returns zero total for empty expense list", () => {
    const summary = getExpenseSummary();
    expect(summary.total).toBe(0);
    expect(Object.keys(summary.byCategory).length).toBe(0);
  });

  it("sums total across all expenses", () => {
    saveExpense(makeExpense({ amount: 3000 }));
    saveExpense(makeExpense({ description: "Flowers", amount: 1500 }));
    const summary = getExpenseSummary();
    expect(summary.total).toBe(4500);
  });

  it("groups expenses by category", () => {
    saveExpense(makeExpense({ category: "Catering", amount: 5000 }));
    saveExpense(makeExpense({ category: "Catering", description: "Cake", amount: 500 }));
    saveExpense(makeExpense({ category: "Florist", description: "Flowers", amount: 2000 }));
    const summary = getExpenseSummary();
    expect(summary.byCategory["Catering"]).toBe(5500);
    expect(summary.byCategory["Florist"]).toBe(2000);
  });

  it("handles expenses with no category by using 'other'", () => {
    storeSet("expenses", [{ id: "e1", amount: 100 }]);
    const summary = getExpenseSummary();
    expect(summary.byCategory["other"]).toBe(100);
  });
});
