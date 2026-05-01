import { describe, it, expect } from "vitest";
import {
  chunk,
  partition,
  groupConsecutive,
} from "../../src/utils/chunk.js";

describe("chunk", () => {
  it("splits into fixed-size chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("evenly divisible", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it("size larger than array", () => {
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });

  it("empty array → empty result", () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it("invalid size → empty", () => {
    expect(chunk([1, 2, 3], 0)).toEqual([]);
    expect(chunk([1, 2, 3], -1)).toEqual([]);
    expect(chunk([1, 2, 3], 1.5)).toEqual([]);
  });

  it("non-array → empty", () => {
    expect(chunk(/** @type {any} */ (null), 2)).toEqual([]);
  });

  it("partition into N equal groups", () => {
    expect(partition([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it("partition with remainder distributes earlier groups", () => {
    expect(partition([1, 2, 3, 4, 5], 3)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("partition more parts than items", () => {
    expect(partition([1, 2], 4)).toEqual([[1], [2], [], []]);
  });

  it("partition invalid parts → empty", () => {
    expect(partition([1, 2], 0)).toEqual([]);
  });

  it("groupConsecutive splits on key change", () => {
    expect(
      groupConsecutive([1, 1, 2, 2, 3, 1], (n) => n),
    ).toEqual([[1, 1], [2, 2], [3], [1]]);
  });

  it("groupConsecutive handles single element", () => {
    expect(groupConsecutive(["a"], (s) => s)).toEqual([["a"]]);
  });

  it("groupConsecutive empty input → empty", () => {
    expect(groupConsecutive([], (n) => n)).toEqual([]);
  });
});
