/**
 * tests/unit/expenses-section.test.mjs — S340: data helpers in src/sections/expenses.js
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
vi.mock("../../src/utils/misc.js", () => ({ uid: () => "uid-exp-001" }));
vi.mock("../../src/utils/sanitize.js", () => ({
  sanitize: (data, _schema) => ({ value: data, errors: [] }),
}));
vi.mock("../../src/services/analytics.js", () => ({
  getTopCategories: () => [],
}));
vi.mock("../../src/core/section-base.js", () => ({
  BaseSection: class {
    constructor(_name) {}
    subscribe() {}
  },
  fromSection: (_s) => ({ mount: vi.fn(), unmount: vi.fn(), capabilities: [] }),
}));
vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));

// Stub URL for CSV tests
vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => "blob:mock"),
  revokeObjectURL: vi.fn(),
});

import {
  saveExpense,
  deleteExpense,
  getExpenseSummary,
  getExpenseMonthlyTrend,
  getLargestExpenses,
  setExpenseCategoryFilter,
  exportExpensesCSV,
} from "../../src/sections/expenses.js";

// ── Helpers ───────────────────────────────────────────────────────────────

const mkExpense = (overrides = {}) => ({
  id: "e1",
  category: "catering",
  description: "Flowers",
  amount: 300,
  date: "2024-03-15",
  ...overrides,
});

beforeEach(() => {
  _store.clear();
  vi.clearAllMocks();
});

// ── saveExpense ───────────────────────────────────────────────────────────

describe("saveExpense", () => {
  it("adds a new expense to the store", () => {
    _store.set("expenses", []);
    const result = saveExpense({ category: "catering", description: "Flowers", amount: 300 });
    expect(result.ok).toBe(true);
    expect(_store.get("expenses")).toHaveLength(1);
    expect(_store.get("expenses")[0].description).toBe("Flowers");
  });

  it("updates an existing expense when existingId provided", () => {
    _store.set("expenses", [mkExpense({ id: "e1", amount: 100 })]);
    saveExpense({ category: "catering", description: "Updated", amount: 200 }, "e1");
    const expenses = _store.get("expenses");
    expect(expenses[0].description).toBe("Updated");
    expect(expenses[0].amount).toBe(200);
    expect(expenses).toHaveLength(1);
  });

  it("returns ok:false for non-existent existingId", () => {
    _store.set("expenses", []);
    const result = saveExpense({ category: "catering", description: "X", amount: 100 }, "nonexistent");
    expect(result.ok).toBe(false);
  });
});

// ── deleteExpense ─────────────────────────────────────────────────────────

describe("deleteExpense", () => {
  it("removes the expense with the given id", () => {
    _store.set("expenses", [mkExpense({ id: "e1" }), mkExpense({ id: "e2" })]);
    deleteExpense("e1");
    expect(_store.get("expenses")).toHaveLength(1);
    expect(_store.get("expenses")[0].id).toBe("e2");
  });

  it("is a no-op for non-existent id", () => {
    _store.set("expenses", [mkExpense({ id: "e1" })]);
    deleteExpense("unknown");
    expect(_store.get("expenses")).toHaveLength(1);
  });
});

// ── getExpenseSummary ─────────────────────────────────────────────────────

describe("getExpenseSummary", () => {
  it("returns zero total for empty expenses", () => {
    _store.set("expenses", []);
    const s = getExpenseSummary();
    expect(s.total).toBe(0);
    expect(s.byCategory).toEqual({});
  });

  it("totals all expenses", () => {
    _store.set("expenses", [
      mkExpense({ amount: 300, category: "catering" }),
      mkExpense({ id: "e2", amount: 200, category: "decor" }),
    ]);
    expect(getExpenseSummary().total).toBe(500);
  });

  it("groups by category correctly", () => {
    _store.set("expenses", [
      mkExpense({ id: "e1", amount: 100, category: "catering" }),
      mkExpense({ id: "e2", amount: 200, category: "catering" }),
      mkExpense({ id: "e3", amount: 150, category: "decor" }),
    ]);
    const s = getExpenseSummary();
    expect(s.byCategory.catering).toBe(300);
    expect(s.byCategory.decor).toBe(150);
  });

  it("uses 'other' for missing category", () => {
    _store.set("expenses", [{ id: "e1", amount: 50, category: undefined }]);
    expect(getExpenseSummary().byCategory.other).toBe(50);
  });
});

// ── getExpenseMonthlyTrend ────────────────────────────────────────────────

describe("getExpenseMonthlyTrend", () => {
  it("returns empty array for no expenses", () => {
    _store.set("expenses", []);
    expect(getExpenseMonthlyTrend()).toEqual([]);
  });

  it("groups by month correctly", () => {
    _store.set("expenses", [
      mkExpense({ id: "e1", date: "2024-03-10", amount: 200 }),
      mkExpense({ id: "e2", date: "2024-03-25", amount: 100 }),
      mkExpense({ id: "e3", date: "2024-04-05", amount: 500 }),
    ]);
    const trend = getExpenseMonthlyTrend();
    const march = trend.find((m) => m.month === "2024-03");
    const april = trend.find((m) => m.month === "2024-04");
    expect(march.total).toBe(300);
    expect(april.total).toBe(500);
  });

  it("skips expenses without date", () => {
    _store.set("expenses", [{ id: "e1", amount: 100 }]);
    expect(getExpenseMonthlyTrend()).toHaveLength(0);
  });

  it("sorts by month ascending", () => {
    _store.set("expenses", [
      mkExpense({ id: "e1", date: "2024-06-01", amount: 100 }),
      mkExpense({ id: "e2", date: "2024-01-15", amount: 200 }),
    ]);
    const trend = getExpenseMonthlyTrend();
    expect(trend[0].month).toBe("2024-01");
    expect(trend[1].month).toBe("2024-06");
  });
});

// ── getLargestExpenses ────────────────────────────────────────────────────

describe("getLargestExpenses", () => {
  it("returns empty array for no expenses", () => {
    _store.set("expenses", []);
    expect(getLargestExpenses()).toEqual([]);
  });

  it("returns expenses sorted by amount descending", () => {
    _store.set("expenses", [
      mkExpense({ id: "e1", amount: 100 }),
      mkExpense({ id: "e2", amount: 500 }),
      mkExpense({ id: "e3", amount: 200 }),
    ]);
    const largest = getLargestExpenses();
    expect(largest[0].amount).toBe(500);
    expect(largest[1].amount).toBe(200);
    expect(largest[2].amount).toBe(100);
  });

  it("respects the limit parameter", () => {
    _store.set("expenses", [
      mkExpense({ id: "e1", amount: 100 }),
      mkExpense({ id: "e2", amount: 200 }),
      mkExpense({ id: "e3", amount: 300 }),
    ]);
    expect(getLargestExpenses(2)).toHaveLength(2);
  });

  it("default limit is 5", () => {
    const expenses = Array.from({ length: 8 }, (_, i) =>
      mkExpense({ id: `e${i}`, amount: (i + 1) * 100 }),
    );
    _store.set("expenses", expenses);
    expect(getLargestExpenses()).toHaveLength(5);
  });

  it("returns proper shape", () => {
    _store.set("expenses", [mkExpense()]);
    const item = getLargestExpenses()[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("category");
    expect(item).toHaveProperty("description");
    expect(item).toHaveProperty("amount");
    expect(item).toHaveProperty("date");
  });
});

// ── setExpenseCategoryFilter ──────────────────────────────────────────────

describe("setExpenseCategoryFilter", () => {
  it("does not throw when called with 'all'", () => {
    expect(() => setExpenseCategoryFilter("all")).not.toThrow();
  });

  it("does not throw when called with a valid category", () => {
    expect(() => setExpenseCategoryFilter("catering")).not.toThrow();
  });

  it("does not throw for an unknown category (falls back to all)", () => {
    expect(() => setExpenseCategoryFilter("unknown_cat_xyz")).not.toThrow();
  });
});

// ── exportExpensesCSV ─────────────────────────────────────────────────────

describe("exportExpensesCSV", () => {
  it("triggers a download without throwing", () => {
    _store.set("expenses", [mkExpense()]);
    const clickSpy = vi.spyOn(HTMLElement.prototype, "click").mockImplementation(() => {});
    expect(() => exportExpensesCSV()).not.toThrow();
    expect(URL.createObjectURL).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("does not throw for empty expenses", () => {
    _store.set("expenses", []);
    const clickSpy = vi.spyOn(HTMLElement.prototype, "click").mockImplementation(() => {});
    expect(() => exportExpensesCSV()).not.toThrow();
    clickSpy.mockRestore();
  });
});
