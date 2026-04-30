import { describe, it, expect } from "vitest";
import {
  summariseDietary,
  formatKitchenReport,
} from "../../src/utils/dietary-summary.js";

describe("dietary-summary", () => {
  it("counts seats per meal", () => {
    const s = summariseDietary([
      { id: "a", meal: "vegan", seats: 1 },
      { id: "b", meal: "vegan", seats: 2 },
      { id: "c", meal: "fish" },
    ]);
    expect(s.byMeal).toEqual({ vegan: 3, fish: 1 });
    expect(s.totalSeats).toBe(4);
  });

  it("normalises meal labels", () => {
    const s = summariseDietary([
      { id: "a", meal: "  Vegan " },
      { id: "b", meal: "VEGAN" },
    ]);
    expect(s.byMeal).toEqual({ vegan: 2 });
  });

  it("ignores non-confirmed guests with explicit status", () => {
    const s = summariseDietary([
      { id: "a", meal: "fish", status: "declined" },
      { id: "b", meal: "fish", status: "confirmed" },
      { id: "c", meal: "fish" },
    ]);
    expect(s.byMeal.fish).toBe(2);
  });

  it("counts allergies and dedupes per guest", () => {
    const s = summariseDietary([
      { id: "a", allergies: ["nuts", "Nuts"], seats: 2 },
      { id: "b", allergies: ["dairy"] },
    ]);
    expect(s.byAllergy).toEqual({ nuts: 2, dairy: 1 });
  });

  it("topAllergies sorted by count desc then key asc", () => {
    const s = summariseDietary([
      { id: "a", allergies: ["nuts"] },
      { id: "b", allergies: ["nuts"] },
      { id: "c", allergies: ["dairy"] },
      { id: "d", allergies: ["soy"] },
    ]);
    expect(s.topAllergies.map((a) => a.key)).toEqual(["nuts", "dairy", "soy"]);
  });

  it("ignores invalid seat counts (defaults to 1)", () => {
    const s = summariseDietary([
      { id: "a", meal: "fish", seats: 0 },
      { id: "b", meal: "fish", seats: -1 },
      { id: "c", meal: "fish", seats: "x" },
    ]);
    expect(s.byMeal.fish).toBe(3);
  });

  it("handles empty input", () => {
    const s = summariseDietary([]);
    expect(s).toEqual({
      totalSeats: 0,
      byMeal: {},
      byAllergy: {},
      topAllergies: [],
    });
  });

  it("ignores null/invalid guests", () => {
    const s = summariseDietary([null, undefined, { id: "a", meal: "x" }]);
    expect(s.totalSeats).toBe(1);
  });

  it("formatKitchenReport emits meal table + total", () => {
    const summary = summariseDietary([
      { id: "a", meal: "vegan", seats: 2 },
      { id: "b", meal: "fish" },
    ]);
    const out = formatKitchenReport(summary);
    expect(out).toContain("meal\tcount");
    expect(out).toContain("vegan\t2");
    expect(out).toContain("fish\t1");
    expect(out).toContain("TOTAL\t3");
  });

  it("formatKitchenReport appends allergies section when present", () => {
    const s = summariseDietary([{ id: "a", meal: "x", allergies: ["nuts"] }]);
    const out = formatKitchenReport(s);
    expect(out).toContain("allergy\tcount");
    expect(out).toContain("nuts\t1");
  });

  it("formatKitchenReport omits allergies section when none", () => {
    const s = summariseDietary([{ id: "a", meal: "x" }]);
    const out = formatKitchenReport(s);
    expect(out).not.toContain("allergy");
  });

  it("formatKitchenReport sorts meals by count desc", () => {
    const s = summariseDietary([
      { id: "a", meal: "fish" },
      { id: "b", meal: "vegan", seats: 5 },
    ]);
    const out = formatKitchenReport(s);
    const lines = out.split("\n");
    expect(lines[1].startsWith("vegan")).toBe(true);
  });
});
