/**
 * tests/unit/vendor-timeline-chart.test.mjs — Sprint 147 vendor timeline chart
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const _store = new Map();
vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: (k) => _store.get(k) ?? null,
  writeBrowserStorageJson: (k, v) => {
    _store.set(k, JSON.parse(JSON.stringify(v)));
  },
}));

beforeEach(() => {
  _store.clear();
});

const { buildPaymentTimeline, buildOutstandingByVendor, topVendorsByCost } =
  await import("../../src/services/vendor-analytics.js");

describe("VendorTimelineChart (Sprint 147)", () => {
  describe("buildPaymentTimeline", () => {
    it("returns empty array for no payments", () => {
      expect(buildPaymentTimeline([])).toEqual([]);
    });

    it("builds cumulative daily timeline", () => {
      const payments = [
        { vendorId: "v1", amount: 1000, paidAt: "2025-06-01" },
        { vendorId: "v2", amount: 500, paidAt: "2025-06-01" },
        { vendorId: "v1", amount: 2000, paidAt: "2025-06-05" },
      ];
      const pts = buildPaymentTimeline(payments);
      expect(pts).toHaveLength(2);
      expect(pts[0]).toEqual({ date: "2025-06-01", paid: 1500, cumulative: 1500 });
      expect(pts[1]).toEqual({ date: "2025-06-05", paid: 2000, cumulative: 3500 });
    });

    it("ignores invalid amounts", () => {
      const payments = [
        { vendorId: "v1", amount: -100, paidAt: "2025-06-01" },
        { vendorId: "v2", amount: 0, paidAt: "2025-06-01" },
        { vendorId: "v3", amount: 300, paidAt: "2025-06-02" },
      ];
      const pts = buildPaymentTimeline(payments);
      expect(pts).toHaveLength(1);
      expect(pts[0].cumulative).toBe(300);
    });
  });

  describe("buildOutstandingByVendor", () => {
    it("computes outstanding balances sorted desc", () => {
      const vendors = [
        { id: "v1", name: "DJ", cost: 5000, paid: 2000 },
        { id: "v2", name: "Photographer", cost: 8000, paid: 1000 },
        { id: "v3", name: "Florist", cost: 3000, paid: 3000 },
      ];
      const result = buildOutstandingByVendor(vendors);
      expect(result[0].name).toBe("Photographer");
      expect(result[0].outstanding).toBe(7000);
      expect(result[2].outstanding).toBe(0);
    });

    it("detects overpayment", () => {
      const vendors = [{ id: "v1", name: "DJ", cost: 1000, paid: 1500 }];
      const result = buildOutstandingByVendor(vendors);
      expect(result[0].outstanding).toBe(0);
      expect(result[0].overpaid).toBe(500);
    });
  });

  describe("topVendorsByCost", () => {
    it("returns top N vendors sorted by cost", () => {
      const vendors = [
        { id: "v1", name: "A", cost: 1000 },
        { id: "v2", name: "B", cost: 5000 },
        { id: "v3", name: "C", cost: 3000 },
        { id: "v4", name: "D", cost: 100 },
      ];
      const top = topVendorsByCost(vendors, 2);
      expect(top).toHaveLength(2);
      expect(top[0].name).toBe("B");
      expect(top[1].name).toBe("C");
    });

    it("excludes zero-cost vendors", () => {
      const vendors = [
        { id: "v1", name: "A", cost: 0 },
        { id: "v2", name: "B", cost: 500 },
      ];
      const top = topVendorsByCost(vendors, 5);
      expect(top).toHaveLength(1);
    });

    it("returns empty for empty list", () => {
      expect(topVendorsByCost([])).toEqual([]);
    });
  });
});
