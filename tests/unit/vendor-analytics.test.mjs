/**
 * tests/unit/vendor-analytics.test.mjs — Sprint 51 / B6
 * Unit tests for src/services/analytics.js
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const { getVendorPaymentSummary, getVendorsByCategory, getOverdueVendors, getPaymentsByMonth } =
  await import("../../src/services/analytics.js");

const NOW = new Date("2026-04-27T12:00:00Z");
const PAST = "2026-03-01";
const FUTURE = "2026-12-01";

const VENDORS = [
  {
    id: "v1",
    category: "catering",
    price: 10000,
    paid: 8000,
    dueDate: PAST,
    updatedAt: "2026-03-15T00:00:00Z",
  },
  {
    id: "v2",
    category: "catering",
    price: 5000,
    paid: 5000,
    dueDate: PAST,
    updatedAt: "2026-03-20T00:00:00Z",
  },
  {
    id: "v3",
    category: "music",
    price: 3000,
    paid: 0,
    dueDate: FUTURE,
    updatedAt: "2026-04-01T00:00:00Z",
  },
  {
    id: "v4",
    category: "venue",
    price: 20000,
    paid: 5000,
    dueDate: PAST,
    updatedAt: "2026-02-10T00:00:00Z",
  },
];

function seed(vendors = VENDORS) {
  initStore({ vendors: { value: vendors }, weddingInfo: { value: {} } });
}

beforeEach(() => seed());

describe("getVendorPaymentSummary", () => {
  it("sums totals correctly", () => {
    const s = getVendorPaymentSummary();
    expect(s.total).toBe(38000);
    expect(s.paid).toBe(18000);
    expect(s.remaining).toBe(20000);
  });

  it("calculates paymentRate", () => {
    const s = getVendorPaymentSummary();
    expect(s.paymentRate).toBeCloseTo(18000 / 38000);
  });

  it("returns zeros for empty store", () => {
    seed([]);
    const s = getVendorPaymentSummary();
    expect(s.total).toBe(0);
    expect(s.paymentRate).toBe(0);
  });

  it("works with object store", () => {
    initStore({ vendors: { value: { v1: VENDORS[0] } }, weddingInfo: { value: {} } });
    expect(getVendorPaymentSummary().total).toBe(10000);
  });
});

describe("getVendorsByCategory", () => {
  it("groups vendors by category", () => {
    const cats = getVendorsByCategory();
    const catering = cats.find((c) => c.category === "catering");
    expect(catering).toBeDefined();
    expect(catering.total).toBe(15000);
    expect(catering.paid).toBe(13000);
    expect(catering.remaining).toBe(2000);
  });

  it("uses fallback category when missing", () => {
    seed([{ id: "v1", price: 100, paid: 0 }]);
    const cats = getVendorsByCategory();
    expect(cats[0].category).toBe("—");
  });

  it("returns empty array for no vendors", () => {
    seed([]);
    expect(getVendorsByCategory()).toHaveLength(0);
  });
});

describe("getOverdueVendors", () => {
  it("returns vendors with past due date and remaining balance", () => {
    const overdue = getOverdueVendors(NOW);
    // v1: remaining 2000, past due ✓
    // v2: fully paid, skip
    // v3: future due, skip
    // v4: remaining 15000, past due ✓
    expect(overdue.map((v) => v.id).sort()).toEqual(["v1", "v4"]);
  });

  it("excludes fully paid vendors even if past due", () => {
    const overdue = getOverdueVendors(NOW);
    expect(overdue.find((v) => v.id === "v2")).toBeUndefined();
  });

  it("excludes vendors without a due date", () => {
    seed([{ id: "v1", price: 100, paid: 0 }]);
    expect(getOverdueVendors(NOW)).toHaveLength(0);
  });

  it("returns empty for no vendors", () => {
    seed([]);
    expect(getOverdueVendors(NOW)).toHaveLength(0);
  });
});

describe("getPaymentsByMonth", () => {
  it("groups payments by month", () => {
    const months = getPaymentsByMonth();
    const feb = months.find((m) => m.month === "2026-02");
    const mar = months.find((m) => m.month === "2026-03");
    expect(feb).toBeDefined();
    expect(mar).toBeDefined();
    // feb: v4 paid 5000
    expect(feb.paid).toBe(5000);
    // mar: v1 paid 8000 + v2 paid 5000 = 13000
    expect(mar.paid).toBe(13000);
  });

  it("returns sorted chronologically", () => {
    const months = getPaymentsByMonth();
    for (let i = 1; i < months.length; i++) {
      expect(months[i].month >= months[i - 1].month).toBe(true);
    }
  });

  it("ignores vendors with no payment", () => {
    const months = getPaymentsByMonth();
    // v3 has paid=0, no updatedAt entry expected
    const apr = months.find((m) => m.month === "2026-04");
    // v3 paid=0 so excluded; no april entry
    expect(apr).toBeUndefined();
  });

  it("returns empty for no vendors with payments", () => {
    seed([{ id: "v1", price: 100, paid: 0, updatedAt: "2026-01-01T00:00:00Z" }]);
    expect(getPaymentsByMonth()).toHaveLength(0);
  });
});
