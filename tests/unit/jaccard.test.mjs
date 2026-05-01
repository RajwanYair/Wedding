import { describe, it, expect } from "vitest";
import {
  jaccard,
  jaccardDistance,
  tokenJaccard,
  multisetJaccard,
} from "../../src/utils/jaccard.js";

describe("jaccard", () => {
  it("identical sets → 1", () => {
    expect(jaccard([1, 2, 3], [1, 2, 3])).toBe(1);
  });

  it("disjoint sets → 0", () => {
    expect(jaccard([1, 2], [3, 4])).toBe(0);
  });

  it("partial overlap", () => {
    expect(jaccard([1, 2, 3], [2, 3, 4])).toBeCloseTo(2 / 4);
  });

  it("two empty → 1", () => {
    expect(jaccard([], [])).toBe(1);
  });

  it("one empty → 0", () => {
    expect(jaccard([1], [])).toBe(0);
  });

  it("dedupes inputs", () => {
    expect(jaccard([1, 1, 2], [2, 2])).toBeCloseTo(1 / 2);
  });

  it("accepts Set instances", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["b", "c"]))).toBeCloseTo(1 / 3);
  });
});

describe("jaccardDistance", () => {
  it("complement of similarity", () => {
    expect(jaccardDistance([1, 2], [2, 3])).toBeCloseTo(1 - 1 / 3);
  });
});

describe("tokenJaccard", () => {
  it("matches by lowercase tokens", () => {
    expect(tokenJaccard("Yair Rajwan", "yair rajwan")).toBe(1);
  });

  it("partial token overlap", () => {
    expect(tokenJaccard("Yair Rajwan", "Yair Cohen")).toBeCloseTo(1 / 3);
  });

  it("empty strings → 1", () => {
    expect(tokenJaccard("", "")).toBe(1);
  });
});

describe("multisetJaccard", () => {
  it("respects duplicates", () => {
    expect(multisetJaccard([1, 1, 2], [1, 2, 2])).toBeCloseTo(2 / 4);
  });

  it("identical multisets → 1", () => {
    expect(multisetJaccard([1, 1, 2], [1, 1, 2])).toBe(1);
  });
});
