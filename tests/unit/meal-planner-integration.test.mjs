/**
 * S615 meal-planner wiring smoke test.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initStore, storeSet } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(() => Promise.resolve()),
}));

const SECTION = readFileSync("src/sections/guests.js", "utf8");

let getMealReport, getChefReport;

describe("S615 meal-planner wiring", () => {
  beforeAll(async () => {
    const mod = await import("../../src/sections/guests.js");
    getMealReport = mod.getMealReport;
    getChefReport = mod.getChefReport;
  });

  beforeEach(() => {
    initStore({ guests: { value: [] } });
  });

  it("imports tallyMeals + formatChefReport from utils/meal-planner.js", () => {
    expect(SECTION).toMatch(/from\s+"\.\.\/utils\/meal-planner\.js"/);
    expect(SECTION).toMatch(/tallyMeals/);
    expect(SECTION).toMatch(/formatChefReport/);
  });

  it("getMealReport returns zeros on empty roster", () => {
    const r = getMealReport();
    expect(r.totalSeats).toBe(0);
    expect(r.unspecified).toBe(0);
    expect(r.sorted).toHaveLength(0);
  });

  it("getMealReport tallies confirmed guests by meal type", () => {
    storeSet("guests", [
      { id: "1", status: "confirmed", meal: "Vegan", seats: 2 },
      { id: "2", status: "confirmed", meal: "vegan" },
      { id: "3", status: "confirmed", meal: "fish" },
      { id: "4", status: "confirmed" },
      { id: "5", status: "declined", meal: "fish" },
    ]);
    const r = getMealReport();
    expect(r.totalSeats).toBe(5);
    expect(r.byType.vegan).toBe(3);
    expect(r.byType.fish).toBe(1);
    expect(r.unspecified).toBe(1);
  });

  it("getChefReport produces tab-separated TOTAL line", () => {
    storeSet("guests", [{ id: "1", status: "confirmed", meal: "veg" }]);
    const out = getChefReport();
    expect(out).toMatch(/veg\t1/);
    expect(out).toMatch(/TOTAL\t1/);
  });
});
