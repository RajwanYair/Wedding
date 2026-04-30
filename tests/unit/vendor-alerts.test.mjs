/**
 * tests/unit/vendor-alerts.test.mjs — S459: vendor-alerts coverage
 */
import { describe, it, expect } from "vitest";
import { findOverdueVendors, totalOutstanding } from "../../src/utils/vendor-alerts.js";

const NOW = new Date("2026-07-01T00:00:00Z");

const VENDORS = [
  // Overdue with outstanding balance
  { id: "1", name: "DJ", price: 1000, paid: 500, dueDate: "2026-06-15" },
  // Due soon (within 7 days)
  { id: "2", name: "Photographer", price: 2000, paid: 1000, dueDate: "2026-07-05" },
  // Due far in the future
  { id: "3", name: "Florist", price: 500, paid: 0, dueDate: "2026-12-01" },
  // Fully paid (no alert)
  { id: "4", name: "Caterer", price: 1000, paid: 1000, dueDate: "2026-06-01" },
  // Soft-deleted (skipped)
  { id: "5", name: "OldDJ", price: 999, paid: 0, dueDate: "2026-06-01", deletedAt: "2026-05-01" },
  // Missing due date (skipped)
  { id: "6", name: "TBD", price: 200, paid: 0 },
];

describe("vendor-alerts — findOverdueVendors", () => {
  it("returns overdue and due-soon vendors", () => {
    const alerts = findOverdueVendors(VENDORS, { now: NOW });
    expect(alerts).toHaveLength(2);
    expect(alerts.map((a) => a.vendor.id)).toEqual(["1", "2"]);
  });

  it("flags severity correctly", () => {
    const alerts = findOverdueVendors(VENDORS, { now: NOW });
    expect(alerts[0].severity).toBe("overdue");
    expect(alerts[1].severity).toBe("due-soon");
  });

  it("computes outstanding balance", () => {
    const alerts = findOverdueVendors(VENDORS, { now: NOW });
    expect(alerts[0].outstanding).toBe(500);
    expect(alerts[1].outstanding).toBe(1000);
  });

  it("respects custom dueSoonDays window", () => {
    const alerts = findOverdueVendors(VENDORS, { now: NOW, dueSoonDays: 0 });
    expect(alerts.map((a) => a.vendor.id)).toEqual(["1"]);
  });

  it("skips fully paid vendors", () => {
    const alerts = findOverdueVendors(VENDORS, { now: NOW });
    expect(alerts.find((a) => a.vendor.id === "4")).toBeUndefined();
  });

  it("skips soft-deleted vendors", () => {
    const alerts = findOverdueVendors(VENDORS, { now: NOW });
    expect(alerts.find((a) => a.vendor.id === "5")).toBeUndefined();
  });

  it("returns empty array for invalid input", () => {
    expect(findOverdueVendors(null, { now: NOW })).toEqual([]);
    expect(findOverdueVendors(undefined, { now: NOW })).toEqual([]);
  });

  it("returns empty array for invalid `now`", () => {
    expect(findOverdueVendors(VENDORS, { now: "not-a-date" })).toEqual([]);
  });
});

describe("vendor-alerts — totalOutstanding", () => {
  it("sums outstanding across active vendors", () => {
    expect(totalOutstanding(VENDORS)).toBe(500 + 1000 + 500 + 200);
  });

  it("ignores soft-deleted vendors", () => {
    expect(totalOutstanding([{ id: "x", price: 100, paid: 0, deletedAt: "now" }])).toBe(0);
  });

  it("returns 0 for non-array input", () => {
    expect(totalOutstanding(null)).toBe(0);
  });
});
