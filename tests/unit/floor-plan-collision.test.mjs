import { describe, it, expect } from "vitest";
import {
  snapToGrid,
  snapItemToGrid,
  rotateItem,
  getBoundingBox,
  boxesOverlap,
  itemsCollide,
  isWithinBounds,
  findCollisions,
  validatePlacement,
  itemSpacing,
} from "../../src/utils/floor-plan-collision.js";

const _item = (id, x, y, w, h, rotation = 0) => ({
  id, type: "table", x, y, width: w, height: h, rotation,
});

describe("floor-plan-collision", () => {
  describe("snapToGrid", () => {
    it("snaps value to nearest grid line", () => {
      expect(snapToGrid(47, 50)).toBe(50);
      expect(snapToGrid(23, 50)).toBe(0);
      expect(snapToGrid(75, 50)).toBe(100);
    });

    it("returns value unchanged for zero gridSize", () => {
      expect(snapToGrid(47, 0)).toBe(47);
    });
  });

  describe("snapItemToGrid", () => {
    it("snaps item position to grid", () => {
      const item = _item("t1", 47, 123, 100, 100);
      const snapped = snapItemToGrid(item, 50);
      expect(snapped.x).toBe(50);
      expect(snapped.y).toBe(100);
    });

    it("handles null item", () => {
      expect(snapItemToGrid(null, 50)).toBeNull();
    });
  });

  describe("rotateItem", () => {
    it("rotates item by degrees", () => {
      const item = _item("t1", 0, 0, 100, 50, 0);
      expect(rotateItem(item, 90).rotation).toBe(90);
      expect(rotateItem(item, 360).rotation).toBe(0);
    });

    it("wraps negative rotation", () => {
      const item = _item("t1", 0, 0, 100, 50, 10);
      expect(rotateItem(item, -20).rotation).toBe(350);
    });

    it("handles null", () => {
      expect(rotateItem(null, 90)).toBeNull();
    });
  });

  describe("getBoundingBox", () => {
    it("returns AABB for non-rotated item", () => {
      const bb = getBoundingBox(_item("t1", 100, 100, 60, 40, 0));
      expect(bb.minX).toBe(70);
      expect(bb.maxX).toBe(130);
      expect(bb.minY).toBe(80);
      expect(bb.maxY).toBe(120);
    });

    it("expands AABB for rotated item", () => {
      const bb0 = getBoundingBox(_item("t1", 100, 100, 100, 50, 0));
      const bb90 = getBoundingBox(_item("t1", 100, 100, 100, 50, 90));
      expect(bb90.maxX - bb90.minX).toBeCloseTo(bb0.maxY - bb0.minY);
    });

    it("handles null", () => {
      expect(getBoundingBox(null)).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
    });
  });

  describe("boxesOverlap", () => {
    it("detects overlapping boxes", () => {
      expect(boxesOverlap({ minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { minX: 5, minY: 5, maxX: 15, maxY: 15 })).toBe(true);
    });

    it("detects non-overlapping boxes", () => {
      expect(boxesOverlap({ minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { minX: 20, minY: 20, maxX: 30, maxY: 30 })).toBe(false);
    });
  });

  describe("itemsCollide", () => {
    it("detects collision between overlapping items", () => {
      expect(itemsCollide(_item("a", 50, 50, 80, 80), _item("b", 100, 50, 80, 80))).toBe(true);
    });

    it("detects no collision for separated items", () => {
      expect(itemsCollide(_item("a", 0, 0, 20, 20), _item("b", 200, 200, 20, 20))).toBe(false);
    });
  });

  describe("isWithinBounds", () => {
    it("returns true when item is inside room", () => {
      expect(isWithinBounds(_item("t", 500, 500, 100, 100), { width: 1000, height: 1000 })).toBe(true);
    });

    it("returns false when item extends past boundary", () => {
      expect(isWithinBounds(_item("t", 10, 10, 100, 100), { width: 1000, height: 1000 })).toBe(false);
    });
  });

  describe("findCollisions", () => {
    it("returns IDs of colliding items", () => {
      const target = _item("a", 50, 50, 80, 80);
      const others = [_item("b", 100, 50, 80, 80), _item("c", 500, 500, 20, 20)];
      expect(findCollisions(target, others)).toEqual(["b"]);
    });

    it("skips self", () => {
      const item = _item("a", 50, 50, 80, 80);
      expect(findCollisions(item, [item])).toEqual([]);
    });
  });

  describe("validatePlacement", () => {
    it("returns valid for non-colliding, in-bounds items", () => {
      const items = [_item("a", 100, 100, 50, 50), _item("b", 300, 300, 50, 50)];
      const result = validatePlacement(items, { width: 500, height: 500 });
      expect(result.valid).toBe(true);
      expect(result.outOfBounds).toEqual([]);
      expect(result.collisions).toEqual([]);
    });

    it("detects out-of-bounds and collisions", () => {
      const items = [_item("a", 10, 10, 50, 50), _item("b", 30, 30, 50, 50)];
      const result = validatePlacement(items, { width: 500, height: 500 });
      expect(result.valid).toBe(false);
      expect(result.outOfBounds.length).toBeGreaterThan(0);
      expect(result.collisions.length).toBeGreaterThan(0);
    });
  });

  describe("itemSpacing", () => {
    it("returns positive distance for separated items", () => {
      const dist = itemSpacing(_item("a", 0, 0, 20, 20), _item("b", 100, 0, 20, 20));
      expect(dist).toBeGreaterThan(0);
    });

    it("returns negative distance for overlapping items", () => {
      const dist = itemSpacing(_item("a", 50, 50, 80, 80), _item("b", 80, 50, 80, 80));
      expect(dist).toBeLessThan(0);
    });

    it("returns Infinity for null input", () => {
      expect(itemSpacing(null, _item("b", 0, 0, 10, 10))).toBe(Infinity);
    });
  });
});
