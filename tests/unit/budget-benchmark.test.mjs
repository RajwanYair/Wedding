import { describe, it, expect } from "vitest";
import {
  getRegionalBenchmark,
  getAvailableRegions,
  compareCategorySpend,
  compareFullBudget,
  budgetDeviationScore,
  topOverBudget,
  savingsOpportunities,
} from "../../src/utils/budget-benchmark.js";

describe("budget-benchmark", () => {
  describe("getRegionalBenchmark", () => {
    it("returns benchmark data for known region", () => {
      const bm = getRegionalBenchmark("center");
      expect(bm).toBeTruthy();
      expect(bm.venue).toBe(45000);
      expect(bm.catering).toBe(35000);
    });

    it("is case-insensitive", () => {
      expect(getRegionalBenchmark("CENTER")).toEqual(getRegionalBenchmark("center"));
    });

    it("returns null for unknown region", () => {
      expect(getRegionalBenchmark("mars")).toBeNull();
    });

    it("returns null for empty input", () => {
      expect(getRegionalBenchmark("")).toBeNull();
      expect(getRegionalBenchmark(null)).toBeNull();
    });
  });

  describe("getAvailableRegions", () => {
    it("returns all region keys", () => {
      const regions = getAvailableRegions();
      expect(regions).toContain("center");
      expect(regions).toContain("north");
      expect(regions).toContain("south");
      expect(regions).toContain("jerusalem");
    });
  });

  describe("compareCategorySpend", () => {
    it("returns on-track for within 15% of benchmark", () => {
      const result = compareCategorySpend(46000, 45000);
      expect(result.status).toBe("on-track");
      expect(result.deviation).toBe(1000);
    });

    it("returns over for >15% above benchmark", () => {
      const result = compareCategorySpend(55000, 45000);
      expect(result.status).toBe("over");
    });

    it("returns under for >15% below benchmark", () => {
      const result = compareCategorySpend(30000, 45000);
      expect(result.status).toBe("under");
    });

    it("handles invalid inputs", () => {
      expect(compareCategorySpend(null, 100).status).toBe("on-track");
      expect(compareCategorySpend(100, 0).status).toBe("on-track");
    });
  });

  describe("compareFullBudget", () => {
    it("compares each category against regional benchmark", () => {
      const actual = { venue: 60000, catering: 30000, photography: 8000 };
      const result = compareFullBudget(actual, "center");
      expect(result.length).toBeGreaterThan(0);
      const venue = result.find((r) => r.category === "venue");
      expect(venue.actual).toBe(60000);
      expect(venue.benchmark).toBe(45000);
      expect(venue.status).toBe("over");
    });

    it("returns empty for unknown region", () => {
      expect(compareFullBudget({ venue: 50000 }, "mars")).toEqual([]);
    });

    it("returns empty for null budget", () => {
      expect(compareFullBudget(null, "center")).toEqual([]);
    });
  });

  describe("budgetDeviationScore", () => {
    it("calculates total deviation score", () => {
      const actual = { venue: 45000, catering: 35000, photography: 8000 };
      const score = budgetDeviationScore(actual, "center");
      expect(score.totalActual).toBeGreaterThan(0);
      expect(score.totalBenchmark).toBeGreaterThan(0);
      expect(typeof score.deviationPercent).toBe("number");
    });

    it("returns zeros for invalid inputs", () => {
      const score = budgetDeviationScore({}, "mars");
      expect(score.totalActual).toBe(0);
      expect(score.totalBenchmark).toBe(0);
    });
  });

  describe("topOverBudget", () => {
    it("returns top N over-budget categories sorted by deviation", () => {
      const actual = { venue: 70000, catering: 50000, photography: 8000, dj: 6000 };
      const top = topOverBudget(actual, "center", 2);
      expect(top.length).toBeLessThanOrEqual(2);
      if (top.length >= 2) {
        expect(top[0].deviation).toBeGreaterThanOrEqual(top[1].deviation);
      }
    });

    it("returns empty when nothing is over budget", () => {
      const actual = { venue: 30000, catering: 20000 };
      expect(topOverBudget(actual, "center")).toEqual([]);
    });
  });

  describe("savingsOpportunities", () => {
    it("lists categories significantly under benchmark", () => {
      const actual = { venue: 20000, catering: 15000, photography: 8000 };
      const savings = savingsOpportunities(actual, "center");
      expect(savings.length).toBeGreaterThan(0);
      for (const s of savings) {
        expect(s.saved).toBeGreaterThan(0);
        expect(s.savedPercent).toBeGreaterThan(0);
      }
    });
  });
});
