/**
 * tests/unit/in-memory-repositories.test.mjs — Tests for store-backed repositories (Sprint 5)
 *
 * Covers ExpenseRepository and VendorRepository, using an in-memory store stub.
 * These are pure synchronous tests — no Supabase client needed.
 */

import { describe, it, expect } from "vitest";
import { ExpenseRepository } from "../../src/repositories/expense-repository.js";
import { VendorRepository } from "../../src/repositories/vendor-repository.js";

// ── In-memory store stub ─────────────────────────────────────────────────

/**
 * Create a minimal in-memory store for a given key.
 * storeGet returns the current items array.
 * storeSet replaces the array.
 * storeUpsert merges by id (insert or replace).
 */
function makeStore(initial = []) {
  let items = [...initial];
  const storeGet = () => items;
  const storeSet = (_key, next) => { items = next; };
  const storeUpsert = (_key, item) => {
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) { items = items.map((i) => (i.id === item.id ? item : i)); }
    else { items = [...items, item]; }
  };
  return { storeGet, storeSet, storeUpsert };
}

// ── ExpenseRepository ─────────────────────────────────────────────────────

describe("ExpenseRepository", () => {
  it("constructs with expenses key", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore();
    const repo = new ExpenseRepository(storeGet, storeSet, storeUpsert);
    expect(repo._key).toBe("expenses");
  });

  it("findByCategory returns only matching expenses", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore([
      { id: "e1", category: "food", amount: 100 },
      { id: "e2", category: "music", amount: 500 },
      { id: "e3", category: "food", amount: 200 },
    ]);
    const repo = new ExpenseRepository(storeGet, storeSet, storeUpsert);
    const result = repo.findByCategory("food");
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.category === "food")).toBe(true);
  });

  it("findByCategory returns empty array when no match", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore([
      { id: "e1", category: "food", amount: 100 },
    ]);
    const repo = new ExpenseRepository(storeGet, storeSet, storeUpsert);
    expect(repo.findByCategory("venue")).toHaveLength(0);
  });

  it("totalAmount sums all expense amounts", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore([
      { id: "e1", amount: 100 },
      { id: "e2", amount: 250 },
      { id: "e3", amount: 50 },
    ]);
    const repo = new ExpenseRepository(storeGet, storeSet, storeUpsert);
    expect(repo.totalAmount()).toBe(400);
  });

  it("totalAmount returns 0 for empty store", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore([]);
    const repo = new ExpenseRepository(storeGet, storeSet, storeUpsert);
    expect(repo.totalAmount()).toBe(0);
  });

  it("summaryByCategory groups totals by category", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore([
      { id: "e1", category: "food", amount: 100 },
      { id: "e2", category: "food", amount: 200 },
      { id: "e3", category: "music", amount: 500 },
    ]);
    const repo = new ExpenseRepository(storeGet, storeSet, storeUpsert);
    const summary = repo.summaryByCategory();
    expect(summary.food).toBe(300);
    expect(summary.music).toBe(500);
  });

  it("summaryByCategory falls back to 'misc' for rows with no category", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore([
      { id: "e1", amount: 75 },
    ]);
    const repo = new ExpenseRepository(storeGet, storeSet, storeUpsert);
    const summary = repo.summaryByCategory();
    expect(summary.misc).toBe(75);
  });
});

// ── VendorRepository ──────────────────────────────────────────────────────

describe("VendorRepository", () => {
  it("constructs with vendors key", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore();
    const repo = new VendorRepository(storeGet, storeSet, storeUpsert);
    expect(repo._key).toBe("vendors");
  });

  it("findByCategory returns only vendors in that category", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore([
      { id: "v1", category: "catering", price: 5000, paid: 2000 },
      { id: "v2", category: "music", price: 1500, paid: 1500 },
      { id: "v3", category: "catering", price: 3000, paid: 0 },
    ]);
    const repo = new VendorRepository(storeGet, storeSet, storeUpsert);
    const result = repo.findByCategory("catering");
    expect(result).toHaveLength(2);
    expect(result.every((v) => v.category === "catering")).toBe(true);
  });

  it("findUnpaid returns vendors with paid < price", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore([
      { id: "v1", price: 5000, paid: 2000 },  // unpaid
      { id: "v2", price: 1500, paid: 1500 },  // fully paid
      { id: "v3", price: 3000, paid: 0 },     // unpaid
    ]);
    const repo = new VendorRepository(storeGet, storeSet, storeUpsert);
    const result = repo.findUnpaid();
    expect(result).toHaveLength(2);
    expect(result.map((v) => v.id).sort()).toEqual(["v1", "v3"]);
  });

  it("findUnpaid returns empty when all vendors are paid", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore([
      { id: "v1", price: 1000, paid: 1000 },
    ]);
    const repo = new VendorRepository(storeGet, storeSet, storeUpsert);
    expect(repo.findUnpaid()).toHaveLength(0);
  });

  it("totalCost sums all vendor prices", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore([
      { id: "v1", price: 5000, paid: 2000 },
      { id: "v2", price: 1500, paid: 1500 },
    ]);
    const repo = new VendorRepository(storeGet, storeSet, storeUpsert);
    expect(repo.totalCost()).toBe(6500);
  });

  it("totalPaid sums all paid amounts", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore([
      { id: "v1", price: 5000, paid: 2000 },
      { id: "v2", price: 1500, paid: 1500 },
    ]);
    const repo = new VendorRepository(storeGet, storeSet, storeUpsert);
    expect(repo.totalPaid()).toBe(3500);
  });

  it("outstanding returns totalCost minus totalPaid", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore([
      { id: "v1", price: 5000, paid: 2000 },
      { id: "v2", price: 1500, paid: 1500 },
    ]);
    const repo = new VendorRepository(storeGet, storeSet, storeUpsert);
    expect(repo.outstanding()).toBe(3000); // 6500 - 3500
  });

  it("outstanding returns 0 when fully paid", () => {
    const { storeGet, storeSet, storeUpsert } = makeStore([
      { id: "v1", price: 1000, paid: 1000 },
    ]);
    const repo = new VendorRepository(storeGet, storeSet, storeUpsert);
    expect(repo.outstanding()).toBe(0);
  });
});
