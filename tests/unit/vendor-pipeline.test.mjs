import { describe, it, expect, beforeEach } from "vitest";
import {
  resetDealCounter,
  createDeal,
  advanceStage,
  markLost,
  markCompleted,
  isStale,
  filterByStage,
  groupByStage,
  sortByStage,
  pipelineSummary,
  avgTimeInStage,
} from "../../src/utils/vendor-pipeline.js";

describe("vendor-pipeline", () => {
  beforeEach(() => resetDealCounter());

  describe("createDeal", () => {
    it("creates a deal with sequential ID", () => {
      const d1 = createDeal("v1");
      const d2 = createDeal("v2", { budget: 5000 });
      expect(d1.id).toBe("deal_1");
      expect(d2.id).toBe("deal_2");
      expect(d1.stage).toBe("lead");
      expect(d2.metadata.budget).toBe(5000);
    });
  });

  describe("advanceStage", () => {
    it("advances to a valid stage and records history", () => {
      const d = createDeal("v1");
      const next = advanceStage(d, "contacted");
      expect(next.stage).toBe("contacted");
      expect(next.history).toHaveLength(1);
      expect(next.history[0].from).toBe("lead");
    });

    it("ignores invalid stage", () => {
      const d = createDeal("v1");
      expect(advanceStage(d, "invalid").stage).toBe("lead");
    });

    it("ignores same stage", () => {
      const d = createDeal("v1");
      expect(advanceStage(d, "lead")).toBe(d);
    });

    it("handles null input", () => {
      expect(advanceStage(null, "booked")).toBeNull();
    });
  });

  describe("markLost / markCompleted", () => {
    it("marks a deal as lost with reason", () => {
      const d = createDeal("v1");
      const lost = markLost(d, "Too expensive");
      expect(lost.stage).toBe("lost");
      expect(lost.metadata.lostReason).toBe("Too expensive");
    });

    it("marks a deal as completed", () => {
      const d = createDeal("v1");
      expect(markCompleted(d).stage).toBe("completed");
    });
  });

  describe("isStale", () => {
    it("returns true for old deals", () => {
      const d = createDeal("v1");
      const old = { ...d, updatedAt: new Date(Date.now() - 20 * 86400000).toISOString() };
      expect(isStale(old, 14)).toBe(true);
    });

    it("returns false for recent deals", () => {
      expect(isStale(createDeal("v1"), 14)).toBe(false);
    });
  });

  describe("filterByStage", () => {
    it("filters deals by stage", () => {
      const deals = [createDeal("v1"), advanceStage(createDeal("v2"), "booked")];
      expect(filterByStage(deals, "lead")).toHaveLength(1);
      expect(filterByStage(deals, "booked")).toHaveLength(1);
    });

    it("returns empty for non-array", () => {
      expect(filterByStage(null, "lead")).toEqual([]);
    });
  });

  describe("groupByStage", () => {
    it("groups deals by stage", () => {
      const deals = [
        createDeal("v1"),
        createDeal("v2"),
        advanceStage(createDeal("v3"), "booked"),
      ];
      const grouped = groupByStage(deals);
      expect(grouped.lead).toHaveLength(2);
      expect(grouped.booked).toHaveLength(1);
    });
  });

  describe("sortByStage", () => {
    it("sorts deals by stage order", () => {
      const deals = [
        advanceStage(createDeal("v1"), "booked"),
        createDeal("v2"),
        advanceStage(createDeal("v3"), "contacted"),
      ];
      const sorted = sortByStage(deals);
      expect(sorted[0].stage).toBe("lead");
      expect(sorted[1].stage).toBe("contacted");
      expect(sorted[2].stage).toBe("booked");
    });
  });

  describe("pipelineSummary", () => {
    it("summarizes pipeline stats", () => {
      const deals = [
        createDeal("v1"),
        markCompleted(createDeal("v2")),
        markLost(createDeal("v3"), "price"),
      ];
      const summary = pipelineSummary(deals);
      expect(summary.total).toBe(3);
      expect(summary.won).toBe(1);
      expect(summary.lost).toBe(1);
      expect(summary.active).toBe(1);
      expect(summary.conversionRate).toBe(50);
    });

    it("returns zeros for empty", () => {
      expect(pipelineSummary([])).toEqual({
        total: 0, byStage: {}, active: 0, won: 0, lost: 0, conversionRate: 0,
      });
    });
  });

  describe("avgTimeInStage", () => {
    it("returns 0 for deals without history", () => {
      expect(avgTimeInStage([createDeal("v1")], "lead")).toBe(0);
    });

    it("returns 0 for non-array", () => {
      expect(avgTimeInStage(null, "lead")).toBe(0);
    });
  });
});
