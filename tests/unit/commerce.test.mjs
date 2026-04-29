/**
 * tests/unit/commerce.test.mjs — S362: services/commerce.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────

const _store = new Map();

vi.mock("../../src/core/store.js", () => ({
  storeGet: (k) => _store.get(k) ?? null,
  storeSet: vi.fn((k, v) => _store.set(k, v)),
}));

// Minimal repo mock — expense + vendor
const _expenses = [];
const _vendors = [];

vi.mock("../../src/services/repositories.js", () => ({
  expenseRepo: {
    getAll: vi.fn(async () => [..._expenses]),
    create: vi.fn(async (data) => ({ id: `e${Date.now()}`, ...data })),
    update: vi.fn(async (id, patch) => ({ id, ...patch })),
    delete: vi.fn(async () => true),
    sumByCategory: vi.fn(async () => {
      const sums = {};
      for (const e of _expenses) {
        sums[e.category] = (sums[e.category] ?? 0) + (e.amount ?? 0);
      }
      return sums;
    }),
  },
  vendorRepo: {
    getAll: vi.fn(async () => [..._vendors]),
    getActive: vi.fn(async () => [..._vendors]),
    getById: vi.fn(async (id) => _vendors.find((v) => v.id === id) ?? null),
    create: vi.fn(async (data) => ({ id: `v${Date.now()}`, ...data })),
    update: vi.fn(async (id, patch) => {
      const v = _vendors.find((x) => x.id === id);
      return v ? { ...v, ...patch } : null;
    }),
  },
}));

import {
  getBudgetTotal,
  getBudgetUsed,
  getBudgetRemaining,
  getExpenseSummary,
  buildCheckoutPayload,
  startCheckout,
  addExpense,
} from "../../src/services/commerce.js";

beforeEach(() => {
  _store.clear();
  _expenses.length = 0;
  _vendors.length = 0;
  vi.clearAllMocks();
});

// ── getBudgetTotal ─────────────────────────────────────────────────────────

describe("getBudgetTotal", () => {
  it("returns 0 when no weddingInfo set", () => {
    expect(getBudgetTotal()).toBe(0);
  });

  it("returns budget from store", () => {
    _store.set("weddingInfo", { budget: 50000 });
    expect(getBudgetTotal()).toBe(50000);
  });

  it("returns 0 for non-numeric budget", () => {
    _store.set("weddingInfo", { budget: "" });
    expect(getBudgetTotal()).toBe(0);
  });
});

// ── getBudgetUsed ──────────────────────────────────────────────────────────

describe("getBudgetUsed", () => {
  it("returns 0 when no expenses", async () => {
    expect(await getBudgetUsed()).toBe(0);
  });

  it("sums all expense amounts", async () => {
    _expenses.push({ amount: 1000 }, { amount: 500 }, { amount: 250 });
    expect(await getBudgetUsed()).toBe(1750);
  });
});

// ── getBudgetRemaining ─────────────────────────────────────────────────────

describe("getBudgetRemaining", () => {
  it("returns budget minus used", async () => {
    _store.set("weddingInfo", { budget: 10000 });
    _expenses.push({ amount: 3000 });
    expect(await getBudgetRemaining()).toBe(7000);
  });

  it("can be negative when over budget", async () => {
    _store.set("weddingInfo", { budget: 1000 });
    _expenses.push({ amount: 1500 });
    expect(await getBudgetRemaining()).toBe(-500);
  });
});

// ── getExpenseSummary ──────────────────────────────────────────────────────

describe("getExpenseSummary", () => {
  it("returns zero totals for no expenses", async () => {
    const s = await getExpenseSummary();
    expect(s.total).toBe(0);
    expect(s.count).toBe(0);
  });

  it("returns correct totals", async () => {
    _expenses.push(
      { category: "catering", amount: 5000 },
      { category: "catering", amount: 2000 },
      { category: "decor", amount: 1000 }
    );
    const s = await getExpenseSummary();
    expect(s.total).toBe(8000);
    expect(s.count).toBe(3);
    expect(s.byCategory.catering.total).toBe(7000);
    expect(s.byCategory.decor.total).toBe(1000);
  });
});

// ── addExpense ─────────────────────────────────────────────────────────────

describe("addExpense", () => {
  it("creates an expense", async () => {
    const expense = await addExpense({ category: "decor", description: "Flowers", amount: 500 });
    expect(expense).toHaveProperty("id");
    expect(expense.amount).toBe(500);
  });

  it("throws for negative amount", async () => {
    await expect(addExpense({ category: "decor", description: "X", amount: -1 })).rejects.toThrow();
  });
});

// ── buildCheckoutPayload ───────────────────────────────────────────────────

describe("buildCheckoutPayload", () => {
  const baseOpts = { successUrl: "https://example.com/ok", cancelUrl: "https://example.com/cancel" };

  it("builds payload from valid items", () => {
    const payload = buildCheckoutPayload(
      [{ id: "v1", name: "Photographer", amount: 2500 }],
      baseOpts
    );
    expect(payload.lineItems).toHaveLength(1);
    expect(payload.lineItems[0].amountCents).toBe(250000);
    expect(payload.totalCents).toBe(250000);
    expect(payload.successUrl).toBe(baseOpts.successUrl);
  });

  it("sums multiple items", () => {
    const payload = buildCheckoutPayload(
      [
        { id: "v1", name: "Venue", amount: 10000 },
        { id: "v2", name: "Catering", amount: 5000 },
      ],
      baseOpts
    );
    expect(payload.totalCents).toBe(1500000);
  });

  it("throws for empty items", () => {
    expect(() => buildCheckoutPayload([], baseOpts)).toThrow();
  });

  it("throws for invalid amount", () => {
    expect(() =>
      buildCheckoutPayload([{ id: "v1", name: "X", amount: -1 }], baseOpts)
    ).toThrow();
  });

  it("includes eventId in metadata when provided", () => {
    const payload = buildCheckoutPayload(
      [{ id: "v1", name: "A", amount: 100 }],
      { ...baseOpts, eventId: "evt-42" }
    );
    expect(payload.metadata).toMatchObject({ eventId: "evt-42" });
  });
});

// ── startCheckout ──────────────────────────────────────────────────────────

describe("startCheckout", () => {
  const mockPayload = {
    lineItems: [],
    totalCents: 0,
    currency: "ils",
    successUrl: "https://ok",
    cancelUrl: "https://cancel",
    metadata: {},
  };

  it("returns ok:false when no sender", async () => {
    const result = await startCheckout(mockPayload, null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("no_sender");
  });

  it("returns sessionUrl on success", async () => {
    const sender = vi.fn(async () => ({ ok: true, data: { url: "https://checkout.stripe.com/xyz" } }));
    const result = await startCheckout(mockPayload, sender);
    expect(result.ok).toBe(true);
    expect(result.sessionUrl).toBe("https://checkout.stripe.com/xyz");
  });

  it("returns error when sender fails", async () => {
    const sender = vi.fn(async () => ({ ok: false, error: "stripe_error" }));
    const result = await startCheckout(mockPayload, sender);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("stripe_error");
  });

  it("returns error when url missing from response", async () => {
    const sender = vi.fn(async () => ({ ok: true, data: {} }));
    const result = await startCheckout(mockPayload, sender);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("missing_url");
  });
});
