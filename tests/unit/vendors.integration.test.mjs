/**
 * tests/unit/vendors.integration.test.mjs — Integration tests for vendors section
 * Covers: saveVendor · deleteVendor · payment tracking
 *
 * Run: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import {
  saveVendor,
  deleteVendor,
  getVendorStats,
  getVendorTimeline,
  getVendorsByCategory,
  getVendorsMissingContract,
  getLowRatedVendors,
  getVendorBudgetShare,
} from "../../src/sections/vendors.js";
import { makeVendor } from "./helpers.js";

beforeEach(() => {
  vi.useFakeTimers();
  initStore({ vendors: { value: [] } });
  storeSet("vendors", []);
});

afterEach(() => {
  vi.useRealTimers();
});

// ── saveVendor ──────────────────────────────────────────────────────────────────────
describe("saveVendor", () => {
  it("creates a new vendor and returns ok:true", () => {
    const result = saveVendor(makeVendor());
    expect(result.ok).toBe(true);
    expect(storeGet("vendors").length).toBe(1);
  });

  it("rejects missing category", () => {
    const result = saveVendor({ name: "Dan" });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects missing name", () => {
    const result = saveVendor({ category: "Photography" });
    expect(result.ok).toBe(false);
  });

  it("stores vendor fields correctly", () => {
    saveVendor(makeVendor({ name: "Alice Flowers", category: "Florist", price: 3000, paid: 1000 }));
    const v = storeGet("vendors")[0];
    expect(v.name).toBe("Alice Flowers");
    expect(v.category).toBe("Florist");
    expect(v.price).toBe(3000);
    expect(v.paid).toBe(1000);
  });

  it("defaults price and paid to 0 when omitted", () => {
    saveVendor({ category: "DJ", name: "DJ Mike" });
    const v = storeGet("vendors")[0];
    expect(v.price).toBe(0);
    expect(v.paid).toBe(0);
  });

  it("assigns a unique id to each vendor", () => {
    saveVendor(makeVendor({ name: "V1" }));
    saveVendor(makeVendor({ name: "V2" }));
    const vendors = storeGet("vendors");
    expect(vendors[0].id).toBeTruthy();
    expect(vendors[0].id).not.toBe(vendors[1].id);
  });

  it("updates an existing vendor by ID", () => {
    saveVendor(makeVendor({ name: "Original" }));
    const id = storeGet("vendors")[0].id;
    const result = saveVendor({ category: "DJ", name: "Updated DJ", price: 2000 }, id);
    expect(result.ok).toBe(true);
    expect(storeGet("vendors")[0].name).toBe("Updated DJ");
    expect(storeGet("vendors")[0].price).toBe(2000);
  });

  it("returns error when updating non-existent vendor", () => {
    const result = saveVendor(makeVendor(), "fake-id");
    expect(result.ok).toBe(false);
  });

  it("stores createdAt and updatedAt on creation", () => {
    saveVendor(makeVendor());
    const v = storeGet("vendors")[0];
    expect(v.createdAt).toBeTruthy();
    expect(v.updatedAt).toBeTruthy();
  });

  it("can save multiple vendors", () => {
    saveVendor(makeVendor({ name: "V1" }));
    saveVendor(makeVendor({ name: "V2" }));
    saveVendor(makeVendor({ name: "V3" }));
    expect(storeGet("vendors").length).toBe(3);
  });
});

// ── deleteVendor ──────────────────────────────────────────────────────────
describe("deleteVendor", () => {
  it("removes the vendor from the store", () => {
    saveVendor(makeVendor());
    const id = storeGet("vendors")[0].id;
    deleteVendor(id);
    expect(storeGet("vendors").length).toBe(0);
  });

  it("leaves other vendors untouched", () => {
    saveVendor(makeVendor({ name: "Keep" }));
    saveVendor(makeVendor({ name: "Delete" }));
    const vendors = storeGet("vendors");
    deleteVendor(vendors[1].id);
    expect(storeGet("vendors").length).toBe(1);
    expect(storeGet("vendors")[0].name).toBe("Keep");
  });

  it("is a no-op for unknown ID", () => {
    saveVendor(makeVendor());
    deleteVendor("nonexistent");
    expect(storeGet("vendors").length).toBe(1);
  });
});

// ── Payment tracking ──────────────────────────────────────────────────────
describe("Payment tracking", () => {
  it("records partial payment (paid < price)", () => {
    saveVendor(makeVendor({ price: 5000, paid: 2000 }));
    const v = storeGet("vendors")[0];
    expect(v.price - v.paid).toBe(3000); // outstanding
  });

  it("records full payment (paid === price)", () => {
    saveVendor(makeVendor({ price: 3000, paid: 3000 }));
    const v = storeGet("vendors")[0];
    expect(v.paid).toBe(v.price);
  });

  it("updates payment amount via update", () => {
    saveVendor(makeVendor({ price: 1000, paid: 0 }));
    const id = storeGet("vendors")[0].id;
    saveVendor({ ...makeVendor(), price: 1000, paid: 500 }, id);
    expect(storeGet("vendors")[0].paid).toBe(500);
  });
});

// ── getVendorStats ────────────────────────────────────────────────────────

describe("getVendorStats", () => {
  it("returns zeros for empty vendor list", () => {
    const stats = getVendorStats();
    expect(stats.total).toBe(0);
    expect(stats.totalCost).toBe(0);
    expect(stats.totalPaid).toBe(0);
    expect(stats.outstanding).toBe(0);
    expect(stats.paymentRate).toBe(0);
  });

  it("calculates total cost from price fields", () => {
    saveVendor(makeVendor({ price: 3000, paid: 0 }));
    saveVendor(makeVendor({ name: "B", price: 2000, paid: 0 }));
    const stats = getVendorStats();
    expect(stats.totalCost).toBe(5000);
    expect(stats.total).toBe(2);
  });

  it("calculates outstanding balance correctly", () => {
    saveVendor(makeVendor({ price: 4000, paid: 1000 }));
    const stats = getVendorStats();
    expect(stats.outstanding).toBe(3000);
    expect(stats.totalPaid).toBe(1000);
  });

  it("calculates paymentRate as percentage", () => {
    saveVendor(makeVendor({ price: 1000, paid: 500 }));
    const stats = getVendorStats();
    expect(stats.paymentRate).toBe(50);
  });

  it("returns 100% paymentRate when fully paid", () => {
    saveVendor(makeVendor({ price: 2000, paid: 2000 }));
    const stats = getVendorStats();
    expect(stats.paymentRate).toBe(100);
  });
});

// ── getVendorTimeline ─────────────────────────────────────────────────────
describe("getVendorTimeline", () => {
  it("returns empty when no vendors have due dates", () => {
    saveVendor(makeVendor({ price: 1000, paid: 0 }));
    expect(getVendorTimeline()).toHaveLength(0);
  });

  it("returns unpaid vendors sorted by soonest due date", () => {
    const d1 = new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10);
    const d2 = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
    saveVendor(makeVendor({ name: "V1", price: 1000, paid: 0, dueDate: d1 }));
    saveVendor(makeVendor({ name: "V2", price: 2000, paid: 0, dueDate: d2 }));
    const timeline = getVendorTimeline();
    expect(timeline).toHaveLength(2);
    expect(timeline[0].name).toBe("V2"); // sooner first
  });

  it("excludes fully paid vendors", () => {
    const d1 = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);
    saveVendor(makeVendor({ name: "Paid", price: 1000, paid: 1000, dueDate: d1 }));
    expect(getVendorTimeline()).toHaveLength(0);
  });
});

// ── getVendorsByCategory ──────────────────────────────────────────────────
describe("getVendorsByCategory", () => {
  it("returns empty for no vendors", () => {
    expect(getVendorsByCategory()).toHaveLength(0);
  });

  it("groups vendors by category with totals", () => {
    saveVendor(makeVendor({ category: "Photography", price: 5000, paid: 2000 }));
    saveVendor(makeVendor({ name: "B", category: "Photography", price: 3000, paid: 1000 }));
    saveVendor(makeVendor({ name: "DJ", category: "Music", price: 2000, paid: 2000 }));
    const groups = getVendorsByCategory();
    expect(groups).toHaveLength(2);
    const photo = groups.find((g) => g.category === "Photography");
    expect(photo.count).toBe(2);
    expect(photo.totalCost).toBe(8000);
    expect(photo.totalPaid).toBe(3000);
  });
});

// ── getVendorsMissingContract ─────────────────────────────────────────────
describe("getVendorsMissingContract", () => {
  it("returns vendors without contractUrl", () => {
    saveVendor(makeVendor({ name: "NoContract" }));
    saveVendor(makeVendor({ name: "HasContract", contractUrl: "https://example.com/contract.pdf" }));
    const missing = getVendorsMissingContract();
    expect(missing).toHaveLength(1);
    expect(missing[0].name).toBe("NoContract");
  });
});

// ── getLowRatedVendors ────────────────────────────────────────────────────
describe("getLowRatedVendors", () => {
  it("returns vendors rated below threshold", () => {
    saveVendor(makeVendor({ name: "Good", rating: 4 }));
    saveVendor(makeVendor({ name: "Bad", rating: 1 }));
    saveVendor(makeVendor({ name: "Ok", rating: 2 }));
    const low = getLowRatedVendors(3);
    expect(low).toHaveLength(2);
    expect(low[0].name).toBe("Bad"); // lowest first
  });

  it("excludes unrated vendors (rating=0)", () => {
    saveVendor(makeVendor({ name: "Unrated" }));
    expect(getLowRatedVendors()).toHaveLength(0);
  });
});

// ── getVendorBudgetShare ──────────────────────────────────────────────────
describe("getVendorBudgetShare", () => {
  it("returns empty for no vendors", () => {
    expect(getVendorBudgetShare()).toHaveLength(0);
  });

  it("calculates percentage share of total budget", () => {
    saveVendor(makeVendor({ name: "Big", price: 8000 }));
    saveVendor(makeVendor({ name: "Small", price: 2000 }));
    const shares = getVendorBudgetShare();
    expect(shares).toHaveLength(2);
    expect(shares[0].name).toBe("Big");
    expect(shares[0].share).toBe(80);
    expect(shares[1].share).toBe(20);
  });
});
