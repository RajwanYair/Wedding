import { describe, it, expect } from "vitest";
import {
  normaliseMeal,
  tallyMeals,
  formatChefReport,
} from "../../src/utils/meal-planner.js";

describe("meal-planner", () => {
  it("normaliseMeal trims and lowercases", () => {
    expect(normaliseMeal("  Vegan ")).toBe("vegan");
  });

  it("normaliseMeal returns null for empty/non-string", () => {
    expect(normaliseMeal("")).toBeNull();
    expect(normaliseMeal("   ")).toBeNull();
    expect(normaliseMeal(null)).toBeNull();
    expect(normaliseMeal(42)).toBeNull();
  });

  it("tallyMeals counts confirmed guests by type", () => {
    const r = tallyMeals([
      { id: "a", meal: "Vegan", status: "confirmed" },
      { id: "b", meal: "vegan", status: "confirmed" },
      { id: "c", meal: "Kosher", status: "confirmed" },
    ]);
    expect(r.byType.vegan).toBe(2);
    expect(r.byType.kosher).toBe(1);
    expect(r.totalSeats).toBe(3);
  });

  it("tallyMeals respects party seats", () => {
    const r = tallyMeals([
      { id: "a", meal: "vegan", status: "confirmed", seats: 4 },
    ]);
    expect(r.byType.vegan).toBe(4);
    expect(r.totalSeats).toBe(4);
  });

  it("tallyMeals tracks unspecified separately", () => {
    const r = tallyMeals([
      { id: "a", status: "confirmed" },
      { id: "b", meal: "  ", status: "confirmed" },
    ]);
    expect(r.unspecified).toBe(2);
    expect(Object.keys(r.byType)).toHaveLength(0);
  });

  it("tallyMeals skips non-confirmed", () => {
    const r = tallyMeals([
      { id: "a", meal: "vegan", status: "pending" },
      { id: "b", meal: "kosher", status: "declined" },
    ]);
    expect(r.totalSeats).toBe(0);
    expect(r.byType).toEqual({});
  });

  it("tallyMeals treats missing status as confirmed", () => {
    const r = tallyMeals([{ id: "a", meal: "vegan" }]);
    expect(r.byType.vegan).toBe(1);
  });

  it("tallyMeals.sorted is descending by count, then alpha", () => {
    const r = tallyMeals([
      { id: "a", meal: "kosher", status: "confirmed" },
      { id: "b", meal: "vegan", status: "confirmed" },
      { id: "c", meal: "vegan", status: "confirmed" },
    ]);
    expect(r.sorted.map((x) => x.type)).toEqual(["vegan", "kosher"]);
  });

  it("tallyMeals defaults seats to 1 for invalid values", () => {
    const r = tallyMeals([
      { id: "a", meal: "vegan", status: "confirmed", seats: -3 },
      { id: "b", meal: "vegan", status: "confirmed", seats: "bad" },
    ]);
    expect(r.byType.vegan).toBe(2);
  });

  it("formatChefReport emits sorted lines + unspecified + total", () => {
    const r = tallyMeals([
      { id: "a", meal: "vegan", status: "confirmed" },
      { id: "b", meal: "vegan", status: "confirmed" },
      { id: "c", meal: "kosher", status: "confirmed" },
      { id: "d", status: "confirmed" },
    ]);
    expect(formatChefReport(r)).toBe("vegan\t2\nkosher\t1\nunspecified\t1\nTOTAL\t4");
  });

  it("formatChefReport omits unspecified row when zero", () => {
    const r = tallyMeals([{ id: "a", meal: "vegan", status: "confirmed" }]);
    expect(formatChefReport(r)).toBe("vegan\t1\nTOTAL\t1");
  });
});
