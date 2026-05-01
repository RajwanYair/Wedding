// @ts-check
/** tests/unit/floor-plan.test.mjs — S597 */
import { describe, it, expect } from "vitest";
import {
  listFurnitureTypes,
  validateFurniture,
  intersects,
  findCollisions,
  totalArea,
} from "../../src/utils/floor-plan.js";

const room = { width: 100, height: 100 };

describe("S597 floor-plan", () => {
  it("listFurnitureTypes includes head-table + dance-floor", () => {
    const t = listFurnitureTypes();
    expect(t).toContain("head-table");
    expect(t).toContain("dance-floor");
  });

  it("validateFurniture passes a valid item", () => {
    expect(validateFurniture({ id: "t1", type: "round-table", x: 10, y: 10, w: 20, h: 20 }, room)).toEqual([]);
  });

  it("validateFurniture rejects unknown type / out-of-room", () => {
    const errs = validateFurniture(
      { id: "t1", type: /** @type {any} */ ("alien"), x: 90, y: 90, w: 20, h: 20 },
      room,
    );
    expect(errs.some((e) => e.includes("unknown type"))).toBe(true);
    expect(errs.some((e) => e.includes("room.width"))).toBe(true);
    expect(errs.some((e) => e.includes("room.height"))).toBe(true);
  });

  it("validateFurniture rejects non-finite dims", () => {
    const errs = validateFurniture(
      { id: "t1", type: "rect-table", x: 0, y: 0, w: Number.NaN, h: 10 },
      room,
    );
    expect(errs.some((e) => e.includes("w must be a finite"))).toBe(true);
  });

  it("intersects detects overlap and disjoint", () => {
    const a = { id: "a", type: /** @type {const} */ ("rect-table"), x: 0, y: 0, w: 10, h: 10 };
    const b = { id: "b", type: /** @type {const} */ ("rect-table"), x: 5, y: 5, w: 10, h: 10 };
    const c = { id: "c", type: /** @type {const} */ ("rect-table"), x: 50, y: 50, w: 10, h: 10 };
    expect(intersects(a, b)).toBe(true);
    expect(intersects(a, c)).toBe(false);
  });

  it("intersects: touching edges do not count", () => {
    const a = { id: "a", type: /** @type {const} */ ("rect-table"), x: 0, y: 0, w: 10, h: 10 };
    const b = { id: "b", type: /** @type {const} */ ("rect-table"), x: 10, y: 0, w: 10, h: 10 };
    expect(intersects(a, b)).toBe(false);
  });

  it("findCollisions returns sorted unique pairs", () => {
    const items = [
      { id: "z", type: /** @type {const} */ ("rect-table"), x: 0, y: 0, w: 10, h: 10 },
      { id: "a", type: /** @type {const} */ ("rect-table"), x: 5, y: 5, w: 10, h: 10 },
      { id: "m", type: /** @type {const} */ ("rect-table"), x: 8, y: 8, w: 10, h: 10 },
    ];
    expect(findCollisions(items)).toEqual([
      ["a", "m"],
      ["a", "z"],
      ["m", "z"],
    ]);
  });

  it("totalArea sums furniture w*h", () => {
    expect(
      totalArea([
        { id: "a", type: "round-table", x: 0, y: 0, w: 10, h: 10 },
        { id: "b", type: "rect-table", x: 0, y: 0, w: 5, h: 4 },
      ]),
    ).toBe(120);
  });
});
