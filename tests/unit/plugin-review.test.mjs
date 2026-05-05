// tests/unit/plugin-review.test.mjs — S621 plugin review pipeline
import { describe, it, expect } from "vitest";
import {
  REVIEW_STATUSES,
  createSubmission,
  approveReview,
  rejectReview,
  isApproved,
  filterByStatus,
  reviewStats,
} from "../../src/utils/plugin-review.js";

describe("plugin-review", () => {
  describe("REVIEW_STATUSES", () => {
    it("lists 3 statuses", () => {
      expect(REVIEW_STATUSES).toEqual(["pending", "approved", "rejected"]);
    });
  });

  describe("createSubmission", () => {
    it("creates a pending review", () => {
      const r = createSubmission("com.example.plugin", "1.0.0");
      expect(r.status).toBe("pending");
      expect(r.pluginId).toBe("com.example.plugin");
      expect(r.version).toBe("1.0.0");
      expect(r.submittedAt).toBeTruthy();
    });
  });

  describe("approveReview", () => {
    it("approves a pending review", () => {
      const sub = createSubmission("p1", "1.0.0");
      const result = approveReview(sub, "admin1", "looks good");
      expect(result.ok).toBe(true);
      expect(result.review.status).toBe("approved");
      expect(result.review.reviewerId).toBe("admin1");
      expect(result.review.notes).toBe("looks good");
    });
    it("rejects non-pending", () => {
      const sub = { ...createSubmission("p1", "1.0.0"), status: "approved" };
      expect(approveReview(sub, "admin1").ok).toBe(false);
    });
    it("requires reviewerId", () => {
      const sub = createSubmission("p1", "1.0.0");
      expect(approveReview(sub, "").ok).toBe(false);
    });
  });

  describe("rejectReview", () => {
    it("rejects a pending review with reason", () => {
      const sub = createSubmission("p1", "1.0.0");
      const result = rejectReview(sub, "admin1", "unsafe API usage");
      expect(result.ok).toBe(true);
      expect(result.review.status).toBe("rejected");
      expect(result.review.notes).toBe("unsafe API usage");
    });
    it("requires rejection reason", () => {
      const sub = createSubmission("p1", "1.0.0");
      expect(rejectReview(sub, "admin1", "").ok).toBe(false);
    });
    it("blocks non-pending", () => {
      const sub = { ...createSubmission("p1", "1.0.0"), status: "rejected" };
      expect(rejectReview(sub, "admin1", "no").ok).toBe(false);
    });
  });

  describe("isApproved", () => {
    it("finds approved plugin version", () => {
      const reviews = [
        { pluginId: "p1", version: "1.0.0", status: "approved" },
        { pluginId: "p1", version: "2.0.0", status: "pending" },
      ];
      expect(isApproved(reviews, "p1", "1.0.0")).toBe(true);
      expect(isApproved(reviews, "p1", "2.0.0")).toBe(false);
    });
    it("returns false for null input", () => {
      expect(isApproved(null, "p1", "1.0.0")).toBe(false);
    });
  });

  describe("filterByStatus", () => {
    it("filters correctly", () => {
      const reviews = [
        { pluginId: "p1", version: "1.0.0", status: "pending" },
        { pluginId: "p2", version: "1.0.0", status: "approved" },
        { pluginId: "p3", version: "1.0.0", status: "pending" },
      ];
      expect(filterByStatus(reviews, "pending")).toHaveLength(2);
      expect(filterByStatus(reviews, "approved")).toHaveLength(1);
    });
    it("returns empty for invalid input", () => {
      expect(filterByStatus(null, "pending")).toEqual([]);
    });
  });

  describe("reviewStats", () => {
    it("computes stats", () => {
      const reviews = [
        { status: "pending" },
        { status: "approved" },
        { status: "approved" },
        { status: "rejected" },
      ];
      const s = reviewStats(reviews);
      expect(s.total).toBe(4);
      expect(s.pending).toBe(1);
      expect(s.approved).toBe(2);
      expect(s.rejected).toBe(1);
    });
    it("handles null", () => {
      expect(reviewStats(null).total).toBe(0);
    });
  });
});
