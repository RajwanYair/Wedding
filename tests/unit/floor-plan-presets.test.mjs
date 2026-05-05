// tests/unit/floor-plan-presets.test.mjs — S625 floor-plan presets
import { describe, it, expect } from "vitest";
import {
  banquetPreset,
  uShapePreset,
  cocktailPreset,
  listPresets,
  getPreset,
} from "../../src/utils/floor-plan-presets.js";

describe("floor-plan-presets", () => {
  describe("listPresets", () => {
    it("returns 3 preset IDs", () => {
      expect(listPresets()).toEqual(["banquet", "u-shape", "cocktail"]);
    });
  });

  describe("banquetPreset", () => {
    it("creates default 10-table banquet", () => {
      const p = banquetPreset();
      expect(p.id).toBe("banquet");
      expect(p.items.length).toBeGreaterThanOrEqual(12); // head + dance + 10 tables
      expect(p.estimatedCapacity).toBe(100);
      expect(p.items.some((i) => i.type === "head-table")).toBe(true);
      expect(p.items.some((i) => i.type === "dance-floor")).toBe(true);
    });
    it("respects custom table count", () => {
      const p = banquetPreset(5);
      const tables = p.items.filter((i) => i.type === "round-table");
      expect(tables).toHaveLength(5);
      expect(p.estimatedCapacity).toBe(50);
    });
    it("clamps to valid range", () => {
      expect(banquetPreset(0).items.filter((i) => i.type === "round-table")).toHaveLength(1);
      expect(banquetPreset(100).items.filter((i) => i.type === "round-table")).toHaveLength(50);
    });
  });

  describe("uShapePreset", () => {
    it("creates U-shape layout", () => {
      const p = uShapePreset();
      expect(p.id).toBe("u-shape");
      expect(p.items).toHaveLength(5);
      expect(p.estimatedCapacity).toBe(60);
    });
  });

  describe("cocktailPreset", () => {
    it("creates cocktail layout with standing tables", () => {
      const p = cocktailPreset();
      expect(p.id).toBe("cocktail");
      const hts = p.items.filter((i) => i.type === "bar-tall");
      expect(hts).toHaveLength(8);
      expect(p.estimatedCapacity).toBe(32);
    });
    it("respects custom high-top count", () => {
      const p = cocktailPreset(4);
      const hts = p.items.filter((i) => i.type === "bar-tall");
      expect(hts).toHaveLength(4);
    });
  });

  describe("getPreset", () => {
    it("returns banquet by ID", () => {
      expect(getPreset("banquet")).toBeTruthy();
      expect(getPreset("banquet").id).toBe("banquet");
    });
    it("returns u-shape by ID", () => {
      expect(getPreset("u-shape").id).toBe("u-shape");
    });
    it("returns cocktail by ID", () => {
      expect(getPreset("cocktail").id).toBe("cocktail");
    });
    it("returns null for unknown", () => {
      expect(getPreset("unknown")).toBeNull();
    });
    it("passes options through", () => {
      const p = getPreset("banquet", { tableCount: 3 });
      const tables = p.items.filter((i) => i.type === "round-table");
      expect(tables).toHaveLength(3);
    });
  });
});
