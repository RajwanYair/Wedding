/**
 * tests/unit/vendor-expense-table-repository.test.mjs — Tests for Sprint 54 repositories
 */

import { describe, it, expect, beforeEach } from "vitest";
import { VendorRepository } from "../../src/repositories/vendor-repository.js";
import { ExpenseRepository } from "../../src/repositories/expense-repository.js";
import { TableRepository } from "../../src/repositories/table-repository.js";

function makeStore() {
  const db = {};
  return {
    storeGet: (key) => db[key] ?? [],
    storeSet: (key, items) => { db[key] = items; },
    storeUpsert: (key, item) => {
      const list = db[key] ?? [];
      const idx = list.findIndex((x) => x.id === item.id);
      db[key] = idx === -1
        ? [...list, item]
        : [...list.slice(0, idx), item, ...list.slice(idx + 1)];
    },
  };
}

// ── VendorRepository ──────────────────────────────────────────────────────

describe("VendorRepository", () => {
  let repo;

  beforeEach(() => {
    const s = makeStore();
    repo = new VendorRepository(s.storeGet, s.storeSet, s.storeUpsert);
  });

  it("findByCategory returns vendors in category", () => {
    repo.create({ id: "v1", category: "catering", price: 5000, paid: 0 });
    repo.create({ id: "v2", category: "music",    price: 2000, paid: 2000 });
    repo.create({ id: "v3", category: "catering", price: 1500, paid: 1500 });
    expect(repo.findByCategory("catering")).toHaveLength(2);
  });

  it("findUnpaid returns vendors with outstanding balance", () => {
    repo.create({ id: "v1", price: 5000, paid: 2000 });
    repo.create({ id: "v2", price: 3000, paid: 3000 });
    expect(repo.findUnpaid()).toHaveLength(1);
    expect(repo.findUnpaid()[0].id).toBe("v1");
  });

  it("totalCost sums all prices", () => {
    repo.create({ id: "v1", price: 1000, paid: 0 });
    repo.create({ id: "v2", price: 2500, paid: 0 });
    expect(repo.totalCost()).toBe(3500);
  });

  it("totalPaid sums all paid amounts", () => {
    repo.create({ id: "v1", price: 1000, paid: 800 });
    repo.create({ id: "v2", price: 2500, paid: 500 });
    expect(repo.totalPaid()).toBe(1300);
  });

  it("outstanding returns totalCost - totalPaid", () => {
    repo.create({ id: "v1", price: 2000, paid: 1000 });
    expect(repo.outstanding()).toBe(1000);
  });
});

// ── ExpenseRepository ─────────────────────────────────────────────────────

describe("ExpenseRepository", () => {
  let repo;

  beforeEach(() => {
    const s = makeStore();
    repo = new ExpenseRepository(s.storeGet, s.storeSet, s.storeUpsert);
  });

  it("findByCategory returns matching expenses", () => {
    repo.create({ id: "e1", category: "venue", amount: 10000 });
    repo.create({ id: "e2", category: "music", amount: 3000 });
    repo.create({ id: "e3", category: "venue", amount: 500 });
    expect(repo.findByCategory("venue")).toHaveLength(2);
  });

  it("totalAmount sums all expense amounts", () => {
    repo.create({ id: "e1", amount: 1000 });
    repo.create({ id: "e2", amount: 2500 });
    expect(repo.totalAmount()).toBe(3500);
  });

  it("summaryByCategory groups and sums", () => {
    repo.create({ id: "e1", category: "venue", amount: 5000 });
    repo.create({ id: "e2", category: "catering", amount: 3000 });
    repo.create({ id: "e3", category: "venue", amount: 1000 });
    const summary = repo.summaryByCategory();
    expect(summary.venue).toBe(6000);
    expect(summary.catering).toBe(3000);
  });

  it("summaryByCategory defaults missing category to misc", () => {
    repo.create({ id: "e1", amount: 100 });
    expect(repo.summaryByCategory().misc).toBe(100);
  });
});

// ── TableRepository ───────────────────────────────────────────────────────

describe("TableRepository", () => {
  let repo;

  beforeEach(() => {
    const s = makeStore();
    repo = new TableRepository(s.storeGet, s.storeSet, s.storeUpsert);
  });

  it("findByShape returns matching tables", () => {
    repo.create({ id: "t1", shape: "round", capacity: 8 });
    repo.create({ id: "t2", shape: "rect",  capacity: 12 });
    repo.create({ id: "t3", shape: "round", capacity: 10 });
    expect(repo.findByShape("round")).toHaveLength(2);
  });

  it("totalCapacity sums capacities", () => {
    repo.create({ id: "t1", capacity: 8 });
    repo.create({ id: "t2", capacity: 12 });
    expect(repo.totalCapacity()).toBe(20);
  });

  it("findByName is case-insensitive", () => {
    repo.create({ id: "t1", name: "Head Table", capacity: 8 });
    expect(repo.findByName("head table")?.id).toBe("t1");
    expect(repo.findByName("HEAD TABLE")?.id).toBe("t1");
  });

  it("findByName returns undefined for no match", () => {
    expect(repo.findByName("nonexistent")).toBeUndefined();
  });
});
