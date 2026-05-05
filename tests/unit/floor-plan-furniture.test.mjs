import { describe, it, expect, beforeEach } from "vitest";
import {
  getCatalogue,
  getTemplate,
  getByCategory,
  getCategories,
  placeItem,
  resetItemCounter,
  totalCapacity,
  totalAreaSqm,
  suggestLayout,
} from "../../src/utils/floor-plan-furniture.js";

describe("floor-plan-furniture", () => {
  beforeEach(() => resetItemCounter());

  describe("getCatalogue", () => {
    it("returns all furniture templates", () => {
      const cat = getCatalogue();
      expect(cat.length).toBeGreaterThan(15);
      expect(cat[0]).toHaveProperty("type");
      expect(cat[0]).toHaveProperty("width");
    });

    it("returns copies not references", () => {
      const a = getCatalogue();
      const b = getCatalogue();
      expect(a[0]).not.toBe(b[0]);
    });
  });

  describe("getTemplate", () => {
    it("returns a template by type", () => {
      const t = getTemplate("dance_floor");
      expect(t.label).toBe("Dance Floor");
      expect(t.width).toBe(6000);
    });

    it("returns null for unknown type", () => {
      expect(getTemplate("unicorn")).toBeNull();
    });
  });

  describe("getByCategory", () => {
    it("filters by category", () => {
      const seating = getByCategory("seating");
      expect(seating.length).toBeGreaterThan(5);
      expect(seating.every((t) => t.category === "seating")).toBe(true);
    });

    it("returns empty for unknown category", () => {
      expect(getByCategory("xyz")).toEqual([]);
    });
  });

  describe("getCategories", () => {
    it("returns unique categories", () => {
      const cats = getCategories();
      expect(cats).toContain("seating");
      expect(cats).toContain("entertainment");
      expect(cats).toContain("catering");
      expect(cats).toContain("ceremony");
      expect(new Set(cats).size).toBe(cats.length);
    });
  });

  describe("placeItem", () => {
    it("places a furniture item with sequential ID", () => {
      const item = placeItem("round_table_8", 5000, 3000);
      expect(item.id).toBe("furn_1");
      expect(item.x).toBe(5000);
      expect(item.width).toBe(1800);
      expect(item.capacity).toBe(8);
    });

    it("applies rotation", () => {
      const item = placeItem("bar", 1000, 1000, 90);
      expect(item.rotation).toBe(90);
    });

    it("returns null for unknown type", () => {
      expect(placeItem("unknown", 0, 0)).toBeNull();
    });
  });

  describe("totalCapacity", () => {
    it("sums capacity of placed items", () => {
      const items = [
        placeItem("round_table_8", 0, 0),
        placeItem("round_table_10", 3000, 0),
      ];
      expect(totalCapacity(items)).toBe(18);
    });

    it("returns 0 for non-array", () => {
      expect(totalCapacity(null)).toBe(0);
    });
  });

  describe("totalAreaSqm", () => {
    it("calculates total area in square meters", () => {
      const items = [placeItem("dance_floor", 0, 0)]; // 6000x6000 = 36 sqm
      expect(totalAreaSqm(items)).toBe(36);
    });
  });

  describe("suggestLayout", () => {
    it("suggests tables for 100 guests", () => {
      const layout = suggestLayout(100);
      expect(layout.tables.length).toBeGreaterThan(1);
      expect(layout.tables[0].type).toBe("head_table");
      expect(layout.extras.length).toBeGreaterThan(0);
    });

    it("suggests rectangular tables", () => {
      const layout = suggestLayout(50, "rectangular");
      expect(layout.tables.some((t) => t.type === "rect_table_8")).toBe(true);
    });

    it("returns empty for invalid count", () => {
      expect(suggestLayout(0)).toEqual({ tables: [], extras: [] });
      expect(suggestLayout(-5)).toEqual({ tables: [], extras: [] });
    });
  });
});
