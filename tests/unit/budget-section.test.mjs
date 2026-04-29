/**
 * tests/unit/budget-section.test.mjs — S339: data helpers in src/sections/budget.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Store ─────────────────────────────────────────────────────────────────

const _store = new Map();

vi.mock("../../src/core/store.js", () => ({
  storeGet: (k) => _store.get(k) ?? null,
  storeSet: vi.fn((k, v) => _store.set(k, v)),
  storeSubscribe: vi.fn(() => () => {}),
  storeSubscribeScoped: vi.fn(() => () => {}),
  cleanupScope: vi.fn(),
}));

// ── Deps ──────────────────────────────────────────────────────────────────

vi.mock("../../src/core/i18n.js", () => ({ t: (k) => k }));
vi.mock("../../src/core/dom.js", () => ({ el: new Proxy({}, { get: () => null }) }));
vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/utils/misc.js", () => ({ uid: () => "uid-budget-001" }));
vi.mock("../../src/utils/sanitize.js", () => ({
  sanitize: (data, _schema) => ({ value: data, errors: [] }),
}));
vi.mock("../../src/services/analytics.js", () => ({
  getAllSummaries: () => ({}),
  getBurndownData: () => ({ points: [], totalBudget: 0, totalSpent: 0 }),
  getProjectedEndDate: () => null,
  getBudgetConsumptionPct: () => 0,
  projectOverrun: () => 0,
}));
vi.mock("../../src/core/section-base.js", () => ({
  BaseSection: class {
    constructor(_name) {}
    subscribe() {}
  },
  fromSection: (_s) => ({ mount: vi.fn(), unmount: vi.fn(), capabilities: [] }),
}));
vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));

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

// ── Helpers ───────────────────────────────────────────────────────────────

const mkEntry = (overrides = {}) => ({
  id: "b1",
  name: "Gift from Uncle",
  amount: 500,
  note: "",
  ...overrides,
});

const mkVendor = (overrides = {}) => ({
  id: "v1",
  category: "photographer",
  name: "Studio X",
  price: 5000,
  paid: 2000,
  ...overrides,
});

const mkExpense = (overrides = {}) => ({
  id: "e1",
  description: "Flowers",
  amount: 300,
  category: "decor",
  date: "2024-03-15",
  ...overrides,
});

beforeEach(() => {
  _store.clear();
});

// ── saveBudgetEntry ───────────────────────────────────────────────────────

describe("saveBudgetEntry", () => {
  it("adds a new budget entry", () => {
    _store.set("budget", []);
    const result = saveBudgetEntry({ name: "Gift A", amount: 1000 });
    expect(result.ok).toBe(true);
    expect(_store.get("budget")).toHaveLength(1);
    expect(_store.get("budget")[0].name).toBe("Gift A");
  });

  it("updates an existing entry when existingId provided", () => {
    _store.set("budget", [mkEntry({ id: "b1", name: "Old Name", amount: 100 })]);
    saveBudgetEntry({ name: "New Name", amount: 200 }, "b1");
    const entries = _store.get("budget");
    expect(entries[0].name).toBe("New Name");
    expect(entries[0].amount).toBe(200);
    expect(entries).toHaveLength(1);
  });

  it("returns ok:false for non-existent existingId", () => {
    _store.set("budget", []);
    const result = saveBudgetEntry({ name: "X", amount: 100 }, "nonexistent");
    expect(result.ok).toBe(false);
  });
});

// ── deleteBudgetEntry ─────────────────────────────────────────────────────

describe("deleteBudgetEntry", () => {
  it("removes the entry with the given id", () => {
    _store.set("budget", [mkEntry({ id: "b1" }), mkEntry({ id: "b2" })]);
    deleteBudgetEntry("b1");
    expect(_store.get("budget")).toHaveLength(1);
    expect(_store.get("budget")[0].id).toBe("b2");
  });

  it("is a no-op for non-existent id", () => {
    _store.set("budget", [mkEntry({ id: "b1" })]);
    deleteBudgetEntry("unknown");
    expect(_store.get("budget")).toHaveLength(1);
  });
});

// ── getBudgetSummary ──────────────────────────────────────────────────────

describe("getBudgetSummary", () => {
  it("returns zeros for empty store", () => {
    _store.set("budget", []);
    _store.set("guests", []);
    _store.set("vendors", []);
    const s = getBudgetSummary();
    expect(s).toEqual({ total: 0, gifts: 0, expenses: 0, balance: 0 });
  });

  it("aggregates gift amounts from guests", () => {
    _store.set("budget", []);
    _store.set("guests", [
      { id: "g1", gift: 500 },
      { id: "g2", gift: 300 },
    ]);
    _store.set("vendors", []);
    const s = getBudgetSummary();
    expect(s.gifts).toBe(800);
    expect(s.total).toBe(800);
  });

  it("includes budget entries in total", () => {
    _store.set("budget", [mkEntry({ amount: 200 })]);
    _store.set("guests", []);
    _store.set("vendors", []);
    const s = getBudgetSummary();
    expect(s.total).toBe(200);
  });

  it("calculates balance (total gifts - vendor expenses)", () => {
    _store.set("budget", []);
    _store.set("guests", [{ id: "g1", gift: 10000 }]);
    _store.set("vendors", [mkVendor({ price: 7000 })]);
    const s = getBudgetSummary();
    expect(s.balance).toBe(3000);
    expect(s.expenses).toBe(7000);
  });
});

// ── getBudgetVsActual ─────────────────────────────────────────────────────

describe("getBudgetVsActual", () => {
  it("returns empty array for empty store", () => {
    _store.set("budget", []);
    _store.set("vendors", []);
    expect(getBudgetVsActual()).toEqual([]);
  });

  it("computes budget vs actual per category", () => {
    _store.set("budget", [mkEntry({ category: "photographer", amount: 6000 })]);
    _store.set("vendors", [mkVendor({ category: "photographer", price: 5000 })]);
    const result = getBudgetVsActual();
    const cat = result.find((r) => r.category === "photographer");
    expect(cat).toBeDefined();
    expect(cat.budgeted).toBe(6000);
    expect(cat.actual).toBe(5000);
    expect(cat.diff).toBe(1000);
  });

  it("groups by 'other' for missing category", () => {
    _store.set("budget", [mkEntry({ category: undefined, amount: 100 })]);
    _store.set("vendors", []);
    const result = getBudgetVsActual();
    expect(result.find((r) => r.category === "other")).toBeDefined();
  });
});

// ── getMonthlyExpenses ────────────────────────────────────────────────────

describe("getMonthlyExpenses", () => {
  it("returns empty array for no expenses", () => {
    _store.set("expenses", []);
    expect(getMonthlyExpenses()).toEqual([]);
  });

  it("groups expenses by month", () => {
    _store.set("expenses", [
      mkExpense({ date: "2024-03-10", amount: 200 }),
      mkExpense({ id: "e2", date: "2024-03-25", amount: 100 }),
      mkExpense({ id: "e3", date: "2024-04-05", amount: 500 }),
    ]);
    const months = getMonthlyExpenses();
    const march = months.find((m) => m.month === "2024-03");
    const april = months.find((m) => m.month === "2024-04");
    expect(march).toBeDefined();
    expect(march.total).toBe(300);
    expect(march.count).toBe(2);
    expect(april.total).toBe(500);
  });

  it("sorts by month ascending", () => {
    _store.set("expenses", [
      mkExpense({ date: "2024-06-01", amount: 100 }),
      mkExpense({ id: "e2", date: "2024-01-01", amount: 200 }),
    ]);
    const months = getMonthlyExpenses();
    expect(months[0].month).toBe("2024-01");
    expect(months[1].month).toBe("2024-06");
  });

  it("skips expenses without date", () => {
    _store.set("expenses", [{ id: "e1", amount: 100 }]);
    expect(getMonthlyExpenses()).toHaveLength(0);
  });
});

// ── getPaymentUtilization ─────────────────────────────────────────────────

describe("getPaymentUtilization", () => {
  it("returns empty array for no vendors", () => {
    _store.set("vendors", []);
    expect(getPaymentUtilization()).toEqual([]);
  });

  it("calculates payment rate per category", () => {
    _store.set("vendors", [
      mkVendor({ category: "photographer", price: 5000, paid: 2500 }),
    ]);
    const result = getPaymentUtilization();
    const cat = result.find((r) => r.category === "photographer");
    expect(cat.committed).toBe(5000);
    expect(cat.paid).toBe(2500);
    expect(cat.rate).toBe(50);
  });

  it("rate is 0 when committed is 0", () => {
    _store.set("vendors", [mkVendor({ price: 0, paid: 0 })]);
    expect(getPaymentUtilization()[0].rate).toBe(0);
  });

  it("aggregates multiple vendors in same category", () => {
    _store.set("vendors", [
      mkVendor({ id: "v1", category: "caterer", price: 4000, paid: 2000 }),
      mkVendor({ id: "v2", category: "caterer", price: 6000, paid: 3000 }),
    ]);
    const result = getPaymentUtilization();
    const caterer = result.find((r) => r.category === "caterer");
    expect(caterer.committed).toBe(10000);
    expect(caterer.paid).toBe(5000);
    expect(caterer.rate).toBe(50);
  });
});

// ── getBudgetForecast ─────────────────────────────────────────────────────

describe("getBudgetForecast", () => {
  it("returns monthlyRate=0 and monthsLeft=null when <2 dated expenses", () => {
    _store.set("weddingInfo", { budgetTarget: 50000 });
    _store.set("vendors", []);
    _store.set("expenses", []);
    const f = getBudgetForecast();
    expect(f.monthlyRate).toBe(0);
    expect(f.monthsLeft).toBeNull();
  });

  it("calculates remaining based on target vs spent", () => {
    _store.set("weddingInfo", { budgetTarget: "50000" });
    _store.set("vendors", [mkVendor({ paid: 5000, price: 10000 })]);
    _store.set("expenses", []);
    const f = getBudgetForecast();
    expect(f.remaining).toBe(45000);
  });

  it("computes monthly rate from dated expenses", () => {
    _store.set("weddingInfo", { budgetTarget: "100000" });
    _store.set("vendors", []);
    _store.set("expenses", [
      mkExpense({ date: "2024-01-01", amount: 3000 }),
      mkExpense({ id: "e2", date: "2024-04-01", amount: 3000 }), // 3 months apart
    ]);
    const f = getBudgetForecast();
    expect(f.monthlyRate).toBeGreaterThan(0);
  });
});

// ── getTopExpenses ────────────────────────────────────────────────────────

describe("getTopExpenses", () => {
  it("returns empty array when no expenses or vendors", () => {
    _store.set("expenses", []);
    _store.set("vendors", []);
    expect(getTopExpenses()).toEqual([]);
  });

  it("combines expenses and vendors sorted by amount descending", () => {
    _store.set("expenses", [mkExpense({ amount: 300 })]);
    _store.set("vendors", [mkVendor({ price: 5000 })]);
    const top = getTopExpenses();
    expect(top[0].amount).toBeGreaterThanOrEqual(top[1].amount);
  });

  it("respects the limit parameter", () => {
    _store.set("expenses", [
      mkExpense({ id: "e1", amount: 100 }),
      mkExpense({ id: "e2", amount: 200 }),
      mkExpense({ id: "e3", amount: 300 }),
    ]);
    _store.set("vendors", []);
    expect(getTopExpenses(2)).toHaveLength(2);
  });

  it("default limit is 10", () => {
    const expenses = Array.from({ length: 15 }, (_, i) =>
      mkExpense({ id: `e${i}`, amount: i * 10 }),
    );
    _store.set("expenses", expenses);
    _store.set("vendors", []);
    expect(getTopExpenses()).toHaveLength(10);
  });
});
