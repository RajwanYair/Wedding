import { describe, it, expect, beforeEach } from "vitest";
import {
  resetDisputeCounter,
  createDispute,
  addEvidence,
  updateStatus,
  resolveDispute,
  escalateDispute,
  closeDispute,
  filterByStatus,
  disputesForVendor,
  disputeSummary,
} from "../../src/utils/payment-dispute.js";

describe("payment-dispute", () => {
  beforeEach(() => resetDisputeCounter());

  describe("createDispute", () => {
    it("creates a dispute with sequential ID", () => {
      const d1 = createDispute("pay_1", "v1", "Overcharge", 500);
      const d2 = createDispute("pay_2", "v2", "No-show", 1000);
      expect(d1.id).toBe("disp_1");
      expect(d2.id).toBe("disp_2");
      expect(d1.status).toBe("open");
      expect(d1.amount).toBe(500);
    });

    it("handles invalid amount", () => {
      expect(createDispute("p", "v", "r", -10).amount).toBe(0);
    });
  });

  describe("addEvidence", () => {
    it("adds evidence to dispute", () => {
      const d = createDispute("p1", "v1", "issue", 100);
      const updated = addEvidence(d, "receipt", "Invoice #123");
      expect(updated.evidence).toHaveLength(1);
      expect(updated.evidence[0].type).toBe("receipt");
    });

    it("defaults unknown type to message", () => {
      const d = createDispute("p1", "v1", "issue", 100);
      expect(addEvidence(d, "unknown", "test").evidence[0].type).toBe("message");
    });

    it("handles null input", () => {
      expect(addEvidence(null, "receipt", "test")).toBeNull();
    });
  });

  describe("updateStatus", () => {
    it("updates to valid status", () => {
      const d = createDispute("p1", "v1", "issue", 100);
      expect(updateStatus(d, "under_review").status).toBe("under_review");
    });

    it("ignores invalid status", () => {
      const d = createDispute("p1", "v1", "issue", 100);
      expect(updateStatus(d, "bogus").status).toBe("open");
    });

    it("ignores same status", () => {
      const d = createDispute("p1", "v1", "issue", 100);
      expect(updateStatus(d, "open")).toBe(d);
    });
  });

  describe("resolveDispute", () => {
    it("resolves with a note", () => {
      const d = createDispute("p1", "v1", "issue", 100);
      const resolved = resolveDispute(d, "Refund issued");
      expect(resolved.status).toBe("resolved");
      expect(resolved.resolution).toBe("Refund issued");
    });
  });

  describe("escalateDispute / closeDispute", () => {
    it("escalates a dispute", () => {
      const d = createDispute("p1", "v1", "issue", 100);
      expect(escalateDispute(d).status).toBe("escalated");
    });

    it("closes a dispute", () => {
      const d = createDispute("p1", "v1", "issue", 100);
      expect(closeDispute(d).status).toBe("closed");
    });
  });

  describe("filterByStatus", () => {
    it("filters disputes by status", () => {
      const disputes = [
        createDispute("p1", "v1", "a", 100),
        resolveDispute(createDispute("p2", "v1", "b", 200), "ok"),
      ];
      expect(filterByStatus(disputes, "open")).toHaveLength(1);
      expect(filterByStatus(disputes, "resolved")).toHaveLength(1);
    });

    it("returns empty for non-array", () => {
      expect(filterByStatus(null, "open")).toEqual([]);
    });
  });

  describe("disputesForVendor", () => {
    it("gets disputes for a vendor", () => {
      const disputes = [
        createDispute("p1", "v1", "a", 100),
        createDispute("p2", "v2", "b", 200),
        createDispute("p3", "v1", "c", 300),
      ];
      expect(disputesForVendor(disputes, "v1")).toHaveLength(2);
    });
  });

  describe("disputeSummary", () => {
    it("summarizes disputes", () => {
      const disputes = [
        createDispute("p1", "v1", "a", 100),
        resolveDispute(createDispute("p2", "v1", "b", 200), "ok"),
        escalateDispute(createDispute("p3", "v2", "c", 300)),
      ];
      const summary = disputeSummary(disputes);
      expect(summary.total).toBe(3);
      expect(summary.open).toBe(1);
      expect(summary.resolved).toBe(1);
      expect(summary.escalated).toBe(1);
      expect(summary.totalAmount).toBe(600);
      expect(summary.avgAmount).toBe(200);
    });

    it("returns zeros for empty", () => {
      expect(disputeSummary([])).toEqual({
        total: 0, open: 0, resolved: 0, escalated: 0, totalAmount: 0, avgAmount: 0,
      });
    });
  });
});
