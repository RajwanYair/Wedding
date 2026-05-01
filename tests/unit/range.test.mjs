import { describe, it, expect } from "vitest";
import { range, inclusive, iterRange } from "../../src/utils/range.js";

describe("range", () => {
  it("single arg yields 0..n-1", () => {
    expect(range(5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("two args yield half-open range", () => {
    expect(range(2, 5)).toEqual([2, 3, 4]);
  });

  it("three args use custom step", () => {
    expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
  });

  it("descending range when end < start", () => {
    expect(range(5, 0)).toEqual([5, 4, 3, 2, 1]);
  });

  it("descending with explicit negative step", () => {
    expect(range(10, 0, -3)).toEqual([10, 7, 4, 1]);
  });

  it("zero step → empty", () => {
    expect(range(0, 5, 0)).toEqual([]);
  });

  it("non-finite step → empty", () => {
    expect(range(0, 5, Number.NaN)).toEqual([]);
  });

  it("inclusive endpoints", () => {
    expect(inclusive(1, 3)).toEqual([1, 2, 3]);
  });

  it("inclusive with negative step", () => {
    expect(inclusive(3, 1, -1)).toEqual([3, 2, 1]);
  });

  it("inclusive step 0 → empty", () => {
    expect(inclusive(1, 3, 0)).toEqual([]);
  });

  it("iterRange yields lazily", () => {
    const out = [];
    for (const v of iterRange(0, 5)) out.push(v);
    expect(out).toEqual([0, 1, 2, 3, 4]);
  });

  it("iterRange stops on zero step", () => {
    expect([...iterRange(0, 5, 0)]).toEqual([]);
  });

  it("iterRange descending", () => {
    expect([...iterRange(3, 0)]).toEqual([3, 2, 1]);
  });
});
