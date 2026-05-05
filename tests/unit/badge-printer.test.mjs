import { describe, it, expect, beforeEach } from "vitest";
import {
  buildBadgeLayout,
  formatThermalText,
  createPrintJob,
  batchPrintJobs,
  markPrinting,
  markDone,
  markFailed,
  queueStats,
  filterByStatus,
  resetJobCounter,
} from "../../src/utils/badge-printer.js";

describe("badge-printer", () => {
  beforeEach(() => resetJobCounter());

  describe("buildBadgeLayout", () => {
    it("builds layout from guest record", () => {
      const badge = buildBadgeLayout({ name: "Alice", tableNumber: 5, meal: "vegan", id: "g1" });
      expect(badge.guestName).toBe("Alice");
      expect(badge.tableName).toBe("5");
      expect(badge.meal).toBe("vegan");
      expect(badge.qrData).toBe("checkin:g1");
      expect(badge.widthMm).toBe(90);
      expect(badge.heightMm).toBe(54);
    });

    it("uses tableName over tableNumber when provided", () => {
      const badge = buildBadgeLayout({ name: "Bob", tableName: "VIP", tableNumber: 1 });
      expect(badge.tableName).toBe("VIP");
    });

    it("applies custom dimensions and greeting", () => {
      const badge = buildBadgeLayout({ name: "X" }, { widthMm: 100, heightMm: 60, greeting: "Welcome!" });
      expect(badge.widthMm).toBe(100);
      expect(badge.heightMm).toBe(60);
      expect(badge.greeting).toBe("Welcome!");
    });

    it("handles null guest", () => {
      const badge = buildBadgeLayout(null);
      expect(badge.guestName).toBe("");
    });
  });

  describe("formatThermalText", () => {
    it("formats badge for thermal printer", () => {
      const text = formatThermalText({
        guestName: "Alice", tableName: "3", meal: "regular", side: "bride",
        greeting: "ברוכים הבאים", widthMm: 90, heightMm: 54,
      });
      expect(text).toContain("ברוכים הבאים");
      expect(text).toContain("Alice");
      expect(text).toContain("Table: 3");
      expect(text).toContain("Meal: regular");
      expect(text).toContain("Side: bride");
    });

    it("returns empty string for null input", () => {
      expect(formatThermalText(null)).toBe("");
    });

    it("uses --- for missing guest name", () => {
      const text = formatThermalText({ guestName: "", widthMm: 90, heightMm: 54 });
      expect(text).toContain("---");
    });
  });

  describe("createPrintJob", () => {
    it("creates a queued print job with sequential ID", () => {
      const badge = buildBadgeLayout({ name: "Test" });
      const job = createPrintJob(badge);
      expect(job.id).toBe("pj_1");
      expect(job.status).toBe("queued");
      expect(job.badge.guestName).toBe("Test");
      expect(job.createdAt).toBeTruthy();
    });

    it("increments IDs", () => {
      createPrintJob(buildBadgeLayout({ name: "A" }));
      const j2 = createPrintJob(buildBadgeLayout({ name: "B" }));
      expect(j2.id).toBe("pj_2");
    });
  });

  describe("batchPrintJobs", () => {
    it("creates jobs for all guests", () => {
      const guests = [{ name: "A" }, { name: "B" }, { name: "C" }];
      const jobs = batchPrintJobs(guests);
      expect(jobs).toHaveLength(3);
      expect(jobs[0].badge.guestName).toBe("A");
      expect(jobs[2].badge.guestName).toBe("C");
    });

    it("returns empty for non-array", () => {
      expect(batchPrintJobs(null)).toEqual([]);
    });
  });

  describe("status transitions", () => {
    it("markPrinting sets status", () => {
      const job = createPrintJob(buildBadgeLayout({ name: "X" }));
      expect(markPrinting(job).status).toBe("printing");
    });

    it("markDone sets status", () => {
      const job = createPrintJob(buildBadgeLayout({ name: "X" }));
      expect(markDone(job).status).toBe("done");
    });

    it("markFailed sets status", () => {
      const job = createPrintJob(buildBadgeLayout({ name: "X" }));
      expect(markFailed(job).status).toBe("failed");
    });

    it("handles null gracefully", () => {
      expect(markPrinting(null)).toBeNull();
      expect(markDone(null)).toBeNull();
      expect(markFailed(null)).toBeNull();
    });
  });

  describe("queueStats", () => {
    it("counts jobs by status", () => {
      const jobs = [
        { status: "queued" }, { status: "queued" },
        { status: "printing" }, { status: "done" }, { status: "failed" },
      ];
      const stats = queueStats(jobs);
      expect(stats).toEqual({ total: 5, queued: 2, printing: 1, done: 1, failed: 1 });
    });

    it("returns zeros for non-array", () => {
      expect(queueStats(null)).toEqual({ total: 0, queued: 0, printing: 0, done: 0, failed: 0 });
    });
  });

  describe("filterByStatus", () => {
    it("filters jobs by status", () => {
      const jobs = [{ status: "queued" }, { status: "done" }, { status: "queued" }];
      expect(filterByStatus(jobs, "queued")).toHaveLength(2);
      expect(filterByStatus(jobs, "done")).toHaveLength(1);
    });

    it("returns empty for non-array", () => {
      expect(filterByStatus(null, "queued")).toEqual([]);
    });
  });
});
