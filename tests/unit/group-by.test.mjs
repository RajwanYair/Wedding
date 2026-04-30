import { describe, it, expect } from "vitest";
import {
  groupBy,
  countBy,
  sumBy,
  pivot,
} from "../../src/utils/group-by.js";

const ROWS = [
  { side: "bride", seats: 2, meal: "veg" },
  { side: "bride", seats: 1, meal: "meat" },
  { side: "groom", seats: 3, meal: "veg" },
  { side: "groom", seats: 1, meal: "veg" },
];

describe("group-by", () => {
  it("groupBy by string key", () => {
    const out = groupBy(ROWS, "side");
    expect(out.bride).toHaveLength(2);
    expect(out.groom).toHaveLength(2);
  });

  it("groupBy by selector", () => {
    const out = groupBy(ROWS, (r) => r.meal);
    expect(out.veg).toHaveLength(3);
    expect(out.meat).toHaveLength(1);
  });

  it("groupBy on non-array returns empty", () => {
    expect(groupBy(/** @type {any} */ (null), "x")).toEqual({});
  });

  it("countBy returns counts", () => {
    expect(countBy(ROWS, "side")).toEqual({ bride: 2, groom: 2 });
  });

  it("countBy empty input", () => {
    expect(countBy([], "side")).toEqual({});
  });

  it("sumBy adds numeric value per group", () => {
    expect(sumBy(ROWS, "side", "seats")).toEqual({ bride: 3, groom: 4 });
  });

  it("sumBy ignores non-numeric values", () => {
    const rows = [
      { k: "a", v: 1 },
      { k: "a", v: "bad" },
      { k: "a", v: 2 },
    ];
    expect(sumBy(rows, "k", "v")).toEqual({ a: 3 });
  });

  it("sumBy on non-array returns empty", () => {
    expect(sumBy(/** @type {any} */ (null), "k", "v")).toEqual({});
  });

  it("pivot tabulates row × col", () => {
    const out = pivot(ROWS, "side", "meal", "seats");
    expect(out).toEqual({
      bride: { veg: 2, meat: 1 },
      groom: { veg: 4 },
    });
  });

  it("pivot with selectors", () => {
    const out = pivot(
      ROWS,
      (r) => r.side,
      (r) => r.meal,
      (r) => r.seats,
    );
    expect(out.groom.veg).toBe(4);
  });

  it("pivot on empty input", () => {
    expect(pivot([], "a", "b", "c")).toEqual({});
  });

  it("groupBy uses string conversion for numeric keys", () => {
    const out = groupBy([{ k: 1 }, { k: 1 }, { k: 2 }], "k");
    expect(Object.keys(out).sort()).toEqual(["1", "2"]);
  });
});
