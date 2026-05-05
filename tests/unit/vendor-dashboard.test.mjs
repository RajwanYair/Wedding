// tests/unit/vendor-dashboard.test.mjs — S640 Vendor dashboard aggregation
import { describe, it, expect } from "vitest";
import {
  aggregateDashboard,
  rankBySla,
  overdueVendors,
  paymentCompletionRate,
  groupByStatus,
} from "../../src/utils/vendor-dashboard.js";

describe("vendor-dashboard", () => {
  describe("aggregateDashboard", () => {
    it("aggregates all fields", () => {
      const d = aggregateDashboard({
        vendors: [
          { id: "v1", status: "active", totalCost: 10000, totalPaid: 5000 },
          { id: "v2", status: "pending", totalCost: 8000, totalPaid: 0 },
        ],
        slaScores: { v1: 90, v2: 70 },
        inboxCounts: { v1: { unread: 3 }, v2: { unread: 1 } },
        milestones: [
          { vendorId: "v1", paid: true, dueDate: "2025-01-01" },
          { vendorId: "v1", paid: false, dueDate: "2024-01-01" },
          { vendorId: "v2", paid: false, dueDate: "2099-01-01" },
        ],
      });
      expect(d.totalVendors).toBe(2);
      expect(d.activeContracts).toBe(1);
      expect(d.totalBudget).toBe(18000);
      expect(d.totalPaid).toBe(5000);
      expect(d.avgSlaScore).toBe(80);
      expect(d.unreadMessages).toBe(4);
      expect(d.pendingPayments).toBe(2);
      expect(d.overduePayments).toBe(1);
    });
    it("handles empty data", () => {
      const d = aggregateDashboard({});
      expect(d.totalVendors).toBe(0);
      expect(d.avgSlaScore).toBe(0);
    });
    it("handles null", () => {
      const d = aggregateDashboard(null);
      expect(d.totalVendors).toBe(0);
    });
  });

  describe("rankBySla", () => {
    it("ranks vendors by score desc", () => {
      const ranked = rankBySla(
        [{ id: "v1", name: "A" }, { id: "v2", name: "B" }, { id: "v3", name: "C" }],
        { v1: 70, v2: 95, v3: 85 },
      );
      expect(ranked[0].id).toBe("v2");
      expect(ranked[1].id).toBe("v3");
      expect(ranked[2].id).toBe("v1");
    });
    it("defaults missing scores to 0", () => {
      const ranked = rankBySla([{ id: "v1", name: "A" }], {});
      expect(ranked[0].score).toBe(0);
    });
  });

  describe("overdueVendors", () => {
    it("finds overdue milestones", () => {
      const now = new Date("2026-05-05");
      const overdue = overdueVendors([
        { vendorId: "v1", paid: false, dueDate: "2026-04-01", name: "Flowers" },
        { vendorId: "v2", paid: true, dueDate: "2025-01-01", name: "DJ" },
        { vendorId: "v3", paid: false, dueDate: "2026-12-01", name: "Venue" },
      ], now);
      expect(overdue).toHaveLength(1);
      expect(overdue[0].vendorId).toBe("v1");
      expect(overdue[0].daysOverdue).toBeGreaterThan(30);
    });
    it("returns empty for no overdue", () => {
      expect(overdueVendors([], new Date())).toEqual([]);
    });
  });

  describe("paymentCompletionRate", () => {
    it("computes rate", () => {
      const r = paymentCompletionRate([{ paid: true }, { paid: false }, { paid: true }]);
      expect(r.total).toBe(3);
      expect(r.paid).toBe(2);
      expect(r.rate).toBe(67);
    });
    it("returns 0 for empty", () => {
      expect(paymentCompletionRate([]).rate).toBe(0);
    });
  });

  describe("groupByStatus", () => {
    it("groups vendors", () => {
      const groups = groupByStatus([
        { id: "v1", name: "A", status: "active" },
        { id: "v2", name: "B", status: "pending" },
        { id: "v3", name: "C", status: "active" },
      ]);
      expect(groups.active).toHaveLength(2);
      expect(groups.pending).toHaveLength(1);
    });
    it("uses unknown for missing status", () => {
      const groups = groupByStatus([{ id: "v1", name: "A" }]);
      expect(groups.unknown).toHaveLength(1);
    });
  });
});
