/**
 * S728 integration tests — Budget benchmark wired into dashboard.js
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({ showToast: vi.fn(), announce: vi.fn() }));
vi.mock("../../src/sections/analytics.js", () => ({ renderArrivalForecast: vi.fn() }));
vi.mock("../../src/services/realtime.js", () => ({
  subscribeToTable: vi.fn(),
  unsubscribeAll: vi.fn(),
}));

import {
  getRegionalBenchmark,
  getBenchmarkRegions,
  compareCategoryToBenchmark,
  compareFullBudgetToBenchmark,
  getBudgetDeviationScore,
  getTopOverBudgetCategories,
  getSavingsOpportunities,
} from "../../src/sections/dashboard.js";

describe("S728 -- getRegionalBenchmark", () => {
  it("returns benchmark data for a valid region", () => {
    const bm = getRegionalBenchmark("center");
    expect(bm).not.toBeNull();
    expect(bm).toHaveProperty("venue");
    expect(bm).toHaveProperty("catering");
  });

  it("returns null for unknown region", () => {
    expect(getRegionalBenchmark("unknown_region")).toBeNull();
  });
});

describe("S728 -- getBenchmarkRegions", () => {
  it("returns array of available regions", () => {
    const regions = getBenchmarkRegions();
    expect(Array.isArray(regions)).toBe(true);
    expect(regions.length).toBeGreaterThan(0);
    expect(regions).toContain("center");
  });
});

describe("S728 -- compareCategoryToBenchmark", () => {
  it("returns on-track when within 15% of benchmark", () => {
    const result = compareCategoryToBenchmark(45000, 45000);
    expect(result.status).toBe("on-track");
    expect(result.deviation).toBe(0);
  });

  it("returns over when >15% above benchmark", () => {
    const result = compareCategoryToBenchmark(60000, 45000);
    expect(result.status).toBe("over");
  });

  it("returns under when >15% below benchmark", () => {
    const result = compareCategoryToBenchmark(30000, 45000);
    expect(result.status).toBe("under");
  });
});

describe("S728 -- compareFullBudgetToBenchmark", () => {
  it("returns array of category comparisons", () => {
    const actual = { venue: 50000, catering: 35000 };
    const results = compareFullBudgetToBenchmark(actual, "center");
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    const venue = results.find((r) => r.category === "venue");
    expect(venue).toBeTruthy();
    expect(venue).toHaveProperty("actual");
    expect(venue).toHaveProperty("benchmark");
    expect(venue).toHaveProperty("status");
  });

  it("returns empty array for unknown region", () => {
    expect(compareFullBudgetToBenchmark({}, "atlantis")).toEqual([]);
  });
});

describe("S728 -- getBudgetDeviationScore", () => {
  it("returns deviation stats", () => {
    const actual = { venue: 50000, catering: 40000, photography: 10000 };
    const score = getBudgetDeviationScore(actual, "center");
    expect(score).toHaveProperty("totalActual");
    expect(score).toHaveProperty("totalBenchmark");
    expect(score).toHaveProperty("deviationPercent");
  });
});

describe("S728 -- getTopOverBudgetCategories", () => {
  it("returns top over-budget categories", () => {
    const actual = { venue: 90000, catering: 80000, photography: 3000 };
    const top = getTopOverBudgetCategories(actual, "center", 2);
    expect(Array.isArray(top)).toBe(true);
    top.forEach((c) => {
      expect(c).toHaveProperty("category");
      expect(c.deviation).toBeGreaterThan(0);
    });
  });
});

describe("S728 -- getSavingsOpportunities", () => {
  it("returns categories where spending is under benchmark (savings)", () => {
    const actual = { venue: 90000, catering: 80000, photography: 2000 };
    const ops = getSavingsOpportunities(actual, "center");
    expect(Array.isArray(ops)).toBe(true);
    ops.forEach((o) => {
      expect(o).toHaveProperty("category");
      expect(o.saved).toBeGreaterThan(0);
    });
  });
});
