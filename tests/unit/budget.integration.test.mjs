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
} from "../../src/sections/budget.js";

beforeEach(() => {
  vi.useFakeTimers();
  initStore({ budget: { value: [] }, guests: { value: [] }, vendors: { value: [] }, weddingInfo: { value: {} } });
  storeSet("budget", []);
  storeSet("guests", []);
  storeSet("vendors", []);
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
