/**
 * tests/unit/vendor-analytics.test.mjs — Sprint 33
 *
 * Tests for src/utils/vendor-analytics.js —
 *   computeVendorPaymentStats, computeVendorPaymentTimeline, sortVendorsByUrgency
 */

import { describe, it, expect } from "vitest";
import { makeVendor } from "./helpers.js";
import {
  computeVendorPaymentStats,
  computeVendorPaymentTimeline,
  sortVendorsByUrgency,
} from "../../src/utils/vendor-analytics.js";

// Fixed "now" so tests are deterministic
const NOW = new Date("2025-07-01T12:00:00Z");
const PAST  = "2025-06-01";  // before NOW
const FUTURE = "2025-08-01"; // after NOW

// ── computeVendorPaymentStats ──────────────────────────────────────────

describe("computeVendorPaymentStats()", () => {
  it("returns zero stats for empty list", () => {
    const s = computeVendorPaymentStats([], NOW);
    expect(s.total).toBe(0);
    expect(s.totalCost).toBe(0);
    expect(s.paymentRate).toBe(0);
  });

  it("computes totals correctly", () => {
    const vendors = [
      makeVendor({ price: 5000, paid: 2000 }),
      makeVendor({ price: 3000, paid: 3000 }),
    ];
    const s = computeVendorPaymentStats(vendors, NOW);
    expect(s.totalCost).toBe(8000);
    expect(s.totalPaid).toBe(5000);
    expect(s.outstanding).toBe(3000);
  });

  it("counts paidCount vs unpaidCount correctly", () => {
    const vendors = [
      makeVendor({ price: 1000, paid: 1000 }),
      makeVendor({ price: 2000, paid: 500 }),
      makeVendor({ price: 1500, paid: 0 }),
    ];
    const s = computeVendorPaymentStats(vendors, NOW);
    expect(s.paidCount).toBe(1);
    expect(s.unpaidCount).toBe(2);
  });

  it("identifies overdue vendors", () => {
    const vendors = [
      makeVendor({ price: 1000, paid: 0, dueDate: PAST }),
      makeVendor({ price: 1000, paid: 0, dueDate: FUTURE }),
    ];
    const s = computeVendorPaymentStats(vendors, NOW);
    expect(s.overdueCount).toBe(1);
    expect(s.overdue).toBe(1000);
  });

  it("does not count fully-paid vendor as overdue", () => {
    const vendors = [makeVendor({ price: 1000, paid: 1000, dueDate: PAST })];
    const s = computeVendorPaymentStats(vendors, NOW);
    expect(s.overdueCount).toBe(0);
    expect(s.overdue).toBe(0);
  });

  it("computes paymentRate as percentage", () => {
    const vendors = [makeVendor({ price: 1000, paid: 250 })];
    expect(computeVendorPaymentStats(vendors, NOW).paymentRate).toBe(25);
  });
});

// ── computeVendorPaymentTimeline ───────────────────────────────────────

describe("computeVendorPaymentTimeline()", () => {
  it("returns empty array for no vendors", () => {
    expect(computeVendorPaymentTimeline([], NOW)).toEqual([]);
  });

  it("groups vendors by month", () => {
    const vendors = [
      makeVendor({ price: 1000, paid: 0, dueDate: "2025-06-15" }),
      makeVendor({ price: 2000, paid: 0, dueDate: "2025-06-20" }),
      makeVendor({ price: 3000, paid: 0, dueDate: "2025-08-01" }),
    ];
    const timeline = computeVendorPaymentTimeline(vendors, NOW);
    expect(timeline).toHaveLength(2);
    expect(timeline[0].month).toBe("2025-06");
    expect(timeline[0].totalDue).toBe(3000);
    expect(timeline[1].month).toBe("2025-08");
  });

  it("places vendors without dueDate in undated bucket at end", () => {
    const vendors = [
      makeVendor({ price: 500, paid: 0, dueDate: "2025-08-01" }),
      makeVendor({ price: 500, paid: 0, dueDate: undefined }),
    ];
    const timeline = computeVendorPaymentTimeline(vendors, NOW);
    expect(timeline.at(-1).month).toBe("undated");
  });

  it("computes overdueInMonth correctly", () => {
    const vendors = [
      makeVendor({ price: 1000, paid: 0, dueDate: PAST }),
      makeVendor({ price: 2000, paid: 2000, dueDate: PAST }), // fully paid — not overdue
    ];
    const timeline = computeVendorPaymentTimeline(vendors, NOW);
    expect(timeline[0].overdueInMonth).toBe(1000);
  });
});

// ── sortVendorsByUrgency ───────────────────────────────────────────────

describe("sortVendorsByUrgency()", () => {
  it("returns empty array for empty input", () => {
    expect(sortVendorsByUrgency([], NOW)).toEqual([]);
  });

  it("places overdue vendors before upcoming", () => {
    const vendors = [
      makeVendor({ name: "Upcoming", price: 1000, paid: 0, dueDate: FUTURE }),
      makeVendor({ name: "Overdue",  price: 1000, paid: 0, dueDate: PAST }),
    ];
    const sorted = sortVendorsByUrgency(vendors, NOW);
    expect(sorted[0].name).toBe("Overdue");
  });

  it("places fully-paid vendors last", () => {
    const vendors = [
      makeVendor({ name: "Paid",    price: 1000, paid: 1000, dueDate: PAST }),
      makeVendor({ name: "Overdue", price: 1000, paid: 0,    dueDate: PAST }),
    ];
    const sorted = sortVendorsByUrgency(vendors, NOW);
    expect(sorted[0].name).toBe("Overdue");
    expect(sorted.at(-1).name).toBe("Paid");
  });

  it("sorts within overdue bucket by dueDate ascending", () => {
    const vendors = [
      makeVendor({ name: "B", price: 1000, paid: 0, dueDate: "2025-05-20" }),
      makeVendor({ name: "A", price: 1000, paid: 0, dueDate: "2025-04-01" }),
    ];
    const sorted = sortVendorsByUrgency(vendors, NOW);
    expect(sorted[0].name).toBe("A");
  });
});
