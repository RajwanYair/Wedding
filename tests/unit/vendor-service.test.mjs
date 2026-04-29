/**
 * tests/unit/vendor-service.test.mjs — Unit tests for vendor domain service (Sprint 27)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeGet } from "../../src/core/store.js";
import { makeVendor } from "./helpers.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  markVendorPaid,
  addVendorPayment,
  markVendorBooked,
  getVendorsByPaymentStatus,
  getBudgetSummary,
  getUnpaidVendors,
} = await import("../../src/services/commerce.js");

function seed(vendors = []) {
  initStore({
    guests: { value: [] },
    tables: { value: [] },
    vendors: { value: vendors },
    expenses: { value: [] },
    timeline: { value: [] },
    timelineDone: { value: {} },
    rsvp_log: { value: [] },
    weddingInfo: { value: {} },
  });
}

// ── markVendorPaid ─────────────────────────────────────────────────────────

describe("markVendorPaid", () => {
  beforeEach(() => seed([makeVendor({ id: "v1", price: 5000, paid: 0 })]));

  it("sets paid to full price by default", async () => {
    await markVendorPaid("v1");
    expect(storeGet("vendors")[0].paid).toBe(5000);
  });

  it("sets paid to explicit amount", async () => {
    await markVendorPaid("v1", 3000);
    expect(storeGet("vendors")[0].paid).toBe(3000);
  });

  it("throws for unknown vendor", async () => {
    await expect(markVendorPaid("zzz")).rejects.toThrow("Vendor not found");
  });
});

// ── addVendorPayment ──────────────────────────────────────────────────────

describe("addVendorPayment", () => {
  beforeEach(() => seed([makeVendor({ id: "v1", price: 5000, paid: 1000 })]));

  it("adds to existing paid amount", async () => {
    await addVendorPayment("v1", 500);
    expect(storeGet("vendors")[0].paid).toBe(1500);
  });

  it("throws for unknown vendor", async () => {
    await expect(addVendorPayment("zzz", 100)).rejects.toThrow("Vendor not found");
  });
});

// ── markVendorBooked ──────────────────────────────────────────────────────

describe("markVendorBooked", () => {
  beforeEach(() => seed([makeVendor({ id: "v1" })]));

  it("updates price when provided", async () => {
    await markVendorBooked("v1", { price: 8000 });
    expect(storeGet("vendors")[0].price).toBe(8000);
  });

  it("updates contact and notes when provided", async () => {
    await markVendorBooked("v1", { contact: "John", notes: "confirmed venue" });
    const v = storeGet("vendors")[0];
    expect(v.contact).toBe("John");
    expect(v.notes).toBe("confirmed venue");
  });
});

// ── getVendorsByPaymentStatus ─────────────────────────────────────────────

describe("getVendorsByPaymentStatus", () => {
  beforeEach(() =>
    seed([
      makeVendor({ id: "v1", price: 1000, paid: 1000 }), // paid
      makeVendor({ id: "v2", price: 2000, paid: 500 }), // partial
      makeVendor({ id: "v3", price: 3000, paid: 0 }), // unpaid
    ]),
  );

  it("returns paid vendors", async () => {
    const r = await getVendorsByPaymentStatus("paid");
    expect(r.map((v) => v.id)).toContain("v1");
    expect(r.map((v) => v.id)).not.toContain("v2");
  });

  it("returns partial payment vendors", async () => {
    const r = await getVendorsByPaymentStatus("partial");
    expect(r.map((v) => v.id)).toContain("v2");
  });

  it("returns unpaid vendors", async () => {
    const r = await getVendorsByPaymentStatus("unpaid");
    expect(r.map((v) => v.id)).toContain("v3");
  });
});

// ── getBudgetSummary ──────────────────────────────────────────────────────

describe("getBudgetSummary", () => {
  beforeEach(() =>
    seed([
      makeVendor({ id: "v1", category: "catering", price: 10000, paid: 5000 }),
      makeVendor({ id: "v2", category: "catering", price: 3000, paid: 3000 }),
      makeVendor({ id: "v3", category: "flowers", price: 2000, paid: 0 }),
    ]),
  );

  it("computes totals", async () => {
    const s = await getBudgetSummary();
    expect(s.total).toBe(3);
    expect(s.totalCost).toBe(15000);
    expect(s.totalPaid).toBe(8000);
    expect(s.outstanding).toBe(7000);
  });

  it("computes paymentRate", async () => {
    const s = await getBudgetSummary();
    expect(s.paymentRate).toBe(53); // 8000/15000 ≈ 53%
  });

  it("breaks down byCategory", async () => {
    const s = await getBudgetSummary();
    expect(s.byCategory.catering.count).toBe(2);
    expect(s.byCategory.catering.cost).toBe(13000);
    expect(s.byCategory.flowers.count).toBe(1);
  });
});

// ── getUnpaidVendors ──────────────────────────────────────────────────────

describe("getUnpaidVendors", () => {
  beforeEach(() =>
    seed([
      makeVendor({ id: "v1", price: 5000, paid: 5000 }), // fully paid
      makeVendor({ id: "v2", price: 3000, paid: 500 }), // outstanding = 2500
      makeVendor({ id: "v3", price: 1000, paid: 0 }), // outstanding = 1000
    ]),
  );

  it("returns vendors with outstanding balances", async () => {
    const r = await getUnpaidVendors(0);
    expect(r.map((v) => v.id)).not.toContain("v1");
    expect(r.map((v) => v.id)).toContain("v2");
    expect(r.map((v) => v.id)).toContain("v3");
  });

  it("respects threshold", async () => {
    const r = await getUnpaidVendors(2000);
    expect(r.map((v) => v.id)).toContain("v2"); // outstanding = 2500
    expect(r.map((v) => v.id)).not.toContain("v3"); // outstanding = 1000
  });

  it("attaches outstanding amount", async () => {
    const r = await getUnpaidVendors(0);
    expect(r.find((v) => v.id === "v2").outstanding).toBe(2500);
  });
});
