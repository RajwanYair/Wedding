/**
 * tests/unit/vendors-section.test.mjs — S337: data helpers in src/sections/vendors.js
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
vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/utils/misc.js", () => ({ uid: () => "uid-test-001" }));
vi.mock("../../src/utils/undo.js", () => ({ pushUndo: vi.fn() }));
vi.mock("../../src/utils/sanitize.js", () => ({
  sanitize: (data, _schema) => ({ value: data, errors: [] }),
}));
vi.mock("../../src/utils/phone.js", () => ({ cleanPhone: (p) => p }));
vi.mock("../../src/utils/vcard.js", () => ({
  buildVCardDataUrl: vi.fn(),
  getVCardFilename: vi.fn(),
}));
vi.mock("../../src/utils/payment-link.js", () => ({
  buildBitLink: vi.fn(),
  buildPayBoxLink: vi.fn(),
}));
vi.mock("../../src/services/analytics.js", () => ({
  getOverdueVendors: () => [],
  buildPaymentTimeline: () => [],
  topVendorsByCost: () => [],
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
  getVendorStats,
  getVendorPaymentSummary,
  getVendorTimeline,
  getVendorsByCategory,
  getVendorsMissingContract,
  getLowRatedVendors,
  getVendorBudgetShare,
  saveVendor,
  deleteVendor,
} from "../../src/sections/vendors.js";

// ── Helpers ───────────────────────────────────────────────────────────────

const mkVendor = (overrides = {}) => ({
  id: "v1",
  category: "photographer",
  name: "Studio XYZ",
  contact: "contact@xyz.com",
  phone: "0501234567",
  price: 5000,
  paid: 2000,
  dueDate: "",
  notes: "",
  contractUrl: "https://example.com/contract.pdf",
  rating: 4,
  ...overrides,
});

beforeEach(() => {
  _store.clear();
});

// ── getVendorStats ────────────────────────────────────────────────────────

describe("getVendorStats", () => {
  it("returns zeros for empty store", () => {
    _store.set("vendors", []);
    const stats = getVendorStats();
    expect(stats).toEqual({ total: 0, totalCost: 0, totalPaid: 0, outstanding: 0, paymentRate: 0 });
  });

  it("returns zeros when store has no vendors key", () => {
    const stats = getVendorStats();
    expect(stats.total).toBe(0);
    expect(stats.paymentRate).toBe(0);
  });

  it("calculates totals correctly", () => {
    _store.set("vendors", [
      mkVendor({ id: "v1", price: 5000, paid: 2000 }),
      mkVendor({ id: "v2", price: 3000, paid: 3000 }),
    ]);
    const stats = getVendorStats();
    expect(stats.total).toBe(2);
    expect(stats.totalCost).toBe(8000);
    expect(stats.totalPaid).toBe(5000);
    expect(stats.outstanding).toBe(3000);
    expect(stats.paymentRate).toBe(63); // round(5000/8000*100)
  });

  it("paymentRate is 0 when totalCost is 0", () => {
    _store.set("vendors", [mkVendor({ price: 0, paid: 0 })]);
    expect(getVendorStats().paymentRate).toBe(0);
  });

  it("paymentRate is 100 when fully paid", () => {
    _store.set("vendors", [mkVendor({ price: 4000, paid: 4000 })]);
    expect(getVendorStats().paymentRate).toBe(100);
  });
});

// ── getVendorPaymentSummary ───────────────────────────────────────────────

describe("getVendorPaymentSummary", () => {
  it("returns zeros for empty list", () => {
    _store.set("vendors", []);
    const s = getVendorPaymentSummary();
    expect(s.total).toBe(0);
    expect(s.paidCount).toBe(0);
    expect(s.overdueCount).toBe(0);
  });

  it("counts fully paid vendors correctly", () => {
    _store.set("vendors", [
      mkVendor({ id: "v1", price: 1000, paid: 1000 }),
      mkVendor({ id: "v2", price: 2000, paid: 1000 }),
    ]);
    const s = getVendorPaymentSummary();
    expect(s.paidCount).toBe(1);
    expect(s.outstanding).toBe(1000);
  });

  it("counts overdue vendors (due date in the past, not fully paid)", () => {
    const pastDate = "2020-01-01";
    _store.set("vendors", [
      mkVendor({ id: "v1", dueDate: pastDate, price: 1000, paid: 500 }),
      mkVendor({ id: "v2", dueDate: pastDate, price: 1000, paid: 1000 }), // fully paid, not overdue
    ]);
    const s = getVendorPaymentSummary();
    expect(s.overdueCount).toBe(1);
  });
});

// ── getVendorTimeline ─────────────────────────────────────────────────────

describe("getVendorTimeline", () => {
  it("returns empty array when no vendors", () => {
    _store.set("vendors", []);
    expect(getVendorTimeline()).toEqual([]);
  });

  it("excludes vendors without due dates", () => {
    _store.set("vendors", [mkVendor({ dueDate: "", paid: 0, price: 1000 })]);
    expect(getVendorTimeline()).toHaveLength(0);
  });

  it("excludes fully paid vendors", () => {
    _store.set("vendors", [mkVendor({ dueDate: "2099-01-01", paid: 1000, price: 1000 })]);
    expect(getVendorTimeline()).toHaveLength(0);
  });

  it("includes vendors with future due dates and remaining balance", () => {
    _store.set("vendors", [
      mkVendor({ id: "v1", dueDate: "2099-06-01", paid: 0, price: 3000 }),
    ]);
    const tl = getVendorTimeline();
    expect(tl).toHaveLength(1);
    expect(tl[0].remaining).toBe(3000);
    expect(tl[0].daysUntilDue).toBeGreaterThan(0);
  });

  it("sorts by daysUntilDue ascending", () => {
    _store.set("vendors", [
      mkVendor({ id: "v1", dueDate: "2099-12-01", paid: 0, price: 1000 }),
      mkVendor({ id: "v2", dueDate: "2099-06-01", paid: 0, price: 500 }),
    ]);
    const tl = getVendorTimeline();
    expect(tl[0].daysUntilDue).toBeLessThan(tl[1].daysUntilDue);
  });
});

// ── getVendorsByCategory ──────────────────────────────────────────────────

describe("getVendorsByCategory", () => {
  it("returns empty array when no vendors", () => {
    _store.set("vendors", []);
    expect(getVendorsByCategory()).toEqual([]);
  });

  it("groups vendors by category with totals", () => {
    _store.set("vendors", [
      mkVendor({ id: "v1", category: "photographer", price: 5000, paid: 2000 }),
      mkVendor({ id: "v2", category: "photographer", price: 3000, paid: 3000 }),
      mkVendor({ id: "v3", category: "caterer", price: 10000, paid: 5000 }),
    ]);
    const cats = getVendorsByCategory();
    const photographer = cats.find((c) => c.category === "photographer");
    const caterer = cats.find((c) => c.category === "caterer");
    expect(photographer).toBeDefined();
    expect(photographer.count).toBe(2);
    expect(photographer.totalCost).toBe(8000);
    expect(caterer).toBeDefined();
    expect(caterer.count).toBe(1);
    expect(caterer.totalCost).toBe(10000);
  });

  it("uses 'other' for unknown categories", () => {
    _store.set("vendors", [mkVendor({ category: "" })]);
    const cats = getVendorsByCategory();
    expect(cats[0].category).toBe("other");
  });
});

// ── getVendorsMissingContract ─────────────────────────────────────────────

describe("getVendorsMissingContract", () => {
  it("returns empty array when all have contracts", () => {
    _store.set("vendors", [mkVendor({ contractUrl: "https://example.com/c.pdf" })]);
    expect(getVendorsMissingContract()).toHaveLength(0);
  });

  it("returns vendors without contractUrl", () => {
    _store.set("vendors", [
      mkVendor({ id: "v1", contractUrl: "" }),
      mkVendor({ id: "v2", contractUrl: "https://example.com/c.pdf" }),
    ]);
    const missing = getVendorsMissingContract();
    expect(missing).toHaveLength(1);
    expect(missing[0].id).toBe("v1");
  });

  it("returns empty array for empty vendors list", () => {
    _store.set("vendors", []);
    expect(getVendorsMissingContract()).toHaveLength(0);
  });
});

// ── getLowRatedVendors ────────────────────────────────────────────────────

describe("getLowRatedVendors", () => {
  it("returns empty array when no vendors", () => {
    _store.set("vendors", []);
    expect(getLowRatedVendors()).toHaveLength(0);
  });

  it("returns vendors rated below default threshold (3)", () => {
    _store.set("vendors", [
      mkVendor({ id: "v1", rating: 2 }),
      mkVendor({ id: "v2", rating: 4 }),
    ]);
    const low = getLowRatedVendors();
    expect(low).toHaveLength(1);
    expect(low[0].id).toBe("v1");
  });

  it("respects custom threshold", () => {
    _store.set("vendors", [
      mkVendor({ id: "v1", rating: 2 }),
      mkVendor({ id: "v2", rating: 4 }),
    ]);
    const low = getLowRatedVendors(5);
    expect(low).toHaveLength(2);
  });

  it("excludes vendors with no rating", () => {
    _store.set("vendors", [mkVendor({ rating: undefined })]);
    expect(getLowRatedVendors()).toHaveLength(0);
  });

  it("sorts by rating ascending", () => {
    _store.set("vendors", [
      mkVendor({ id: "v1", rating: 2 }),
      mkVendor({ id: "v2", rating: 1 }),
    ]);
    const low = getLowRatedVendors();
    expect(low[0].rating).toBe(1);
  });
});

// ── getVendorBudgetShare ──────────────────────────────────────────────────

describe("getVendorBudgetShare", () => {
  it("returns empty array when no vendors", () => {
    _store.set("vendors", []);
    expect(getVendorBudgetShare()).toEqual([]);
  });

  it("returns empty array when all vendors have price=0", () => {
    _store.set("vendors", [mkVendor({ price: 0 })]);
    expect(getVendorBudgetShare()).toEqual([]);
  });

  it("calculates shares correctly", () => {
    _store.set("vendors", [
      mkVendor({ id: "v1", name: "A", price: 7500 }),
      mkVendor({ id: "v2", name: "B", price: 2500 }),
    ]);
    const shares = getVendorBudgetShare();
    expect(shares[0].share).toBe(75);
    expect(shares[1].share).toBe(25);
  });

  it("sorts by share descending", () => {
    _store.set("vendors", [
      mkVendor({ id: "v1", price: 2000 }),
      mkVendor({ id: "v2", price: 8000 }),
    ]);
    const shares = getVendorBudgetShare();
    expect(shares[0].price).toBe(8000);
  });
});

// ── saveVendor ────────────────────────────────────────────────────────────

describe("saveVendor", () => {
  it("adds a new vendor to the store", () => {
    _store.set("vendors", []);
    const result = saveVendor({
      category: "photographer",
      name: "Test Studio",
      price: 5000,
      paid: 0,
    });
    expect(result.ok).toBe(true);
    const vendors = _store.get("vendors");
    expect(vendors).toHaveLength(1);
    expect(vendors[0].name).toBe("Test Studio");
  });

  it("updates an existing vendor when existingId is provided", () => {
    _store.set("vendors", [mkVendor({ id: "v1", name: "Old Name" })]);
    saveVendor({ category: "photographer", name: "New Name", price: 5000, paid: 0 }, "v1");
    const vendors = _store.get("vendors");
    expect(vendors[0].name).toBe("New Name");
    expect(vendors).toHaveLength(1);
  });
});

// ── deleteVendor ──────────────────────────────────────────────────────────

describe("deleteVendor", () => {
  it("removes a vendor from the store", () => {
    _store.set("vendors", [
      mkVendor({ id: "v1" }),
      mkVendor({ id: "v2" }),
    ]);
    deleteVendor("v1");
    const vendors = _store.get("vendors");
    expect(vendors).toHaveLength(1);
    expect(vendors[0].id).toBe("v2");
  });

  it("is a no-op for a non-existent id", () => {
    _store.set("vendors", [mkVendor({ id: "v1" })]);
    deleteVendor("nonexistent");
    expect(_store.get("vendors")).toHaveLength(1);
  });
});
