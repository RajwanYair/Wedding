/**
 * S614 budget category forecast wiring smoke test.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initStore, storeSet } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(() => Promise.resolve()),
}));

const SECTION = readFileSync("src/sections/budget.js", "utf8");

describe("S614 budget category forecast wiring", () => {
  beforeEach(() => {
    initStore({ budget: { value: [] }, expenses: { value: [] } });
  });

  it("imports from utils/budget-forecast.js", () => {
    expect(SECTION).toMatch(/from\s+"\.\.\/utils\/budget-forecast\.js"/);
    expect(SECTION).toMatch(/forecast as _forecastByCategory/);
  });

  it("getCategoryForecast returns zeros on empty data", async () => {
    const { getCategoryForecast } = await import("../../src/sections/budget.js");
    const r = getCategoryForecast();
    expect(r.totalBudget).toBe(0);
    expect(r.totalSpent).toBe(0);
    expect(r.categories).toHaveLength(0);
  });

  it("getCategoryForecast aggregates budget vs expenses by category", async () => {
    storeSet("budget", [
      { category: "venue", amount: 1000 },
      { category: "food", amount: 500 },
    ]);
    storeSet("expenses", [
      { category: "venue", amount: 600 },
      { category: "venue", amount: 300 },
      { category: "food", amount: 700 },
    ]);
    const { getCategoryForecast } = await import("../../src/sections/budget.js");
    const r = getCategoryForecast();
    expect(r.totalBudget).toBe(1500);
    expect(r.totalSpent).toBe(1600);
    expect(r.categoriesOverBudget).toBe(1);
    const food = r.categories.find((c) => c.category === "food");
    expect(food?.overBudget).toBe(true);
  });

  it("getProjectedFinalSpend scales linearly with progress", async () => {
    storeSet("expenses", [
      { category: "x", amount: 200 },
      { category: "y", amount: 300 },
    ]);
    const { getProjectedFinalSpend } = await import("../../src/sections/budget.js");
    expect(getProjectedFinalSpend(0.5)).toBe(1000);
    expect(getProjectedFinalSpend(1)).toBe(500);
    expect(Number.isNaN(getProjectedFinalSpend(0))).toBe(true);
  });
});
