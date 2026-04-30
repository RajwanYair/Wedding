import { describe, it, expect } from "vitest";
import {
  levenshtein,
  similarity,
  closestMatch,
} from "../../src/utils/levenshtein.js";

describe("levenshtein", () => {
  it("identical strings → 0", () => {
    expect(levenshtein("kitten", "kitten")).toBe(0);
  });

  it("empty vs string", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });

  it("classic example", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });

  it("single substitution", () => {
    expect(levenshtein("flaw", "lawn")).toBe(2);
  });

  it("non-string returns NaN", () => {
    expect(levenshtein(/** @type {any} */ (null), "x")).toBeNaN();
  });

  it("similarity identical → 1", () => {
    expect(similarity("abc", "abc")).toBe(1);
  });

  it("similarity both empty → 1", () => {
    expect(similarity("", "")).toBe(1);
  });

  it("similarity completely different ≈ 0", () => {
    expect(similarity("aaa", "bbb")).toBeCloseTo(0, 5);
  });

  it("similarity invalid input → 0", () => {
    expect(similarity(/** @type {any} */ (null), "x")).toBe(0);
  });

  it("closestMatch picks lowest distance", () => {
    expect(
      closestMatch("kitten", ["sitting", "mitten", "kit"]),
    ).toEqual({ match: "mitten", distance: 1, score: expect.any(Number) });
  });

  it("closestMatch threshold filters candidates", () => {
    expect(closestMatch("abc", ["xyz"], { threshold: 0.5 })).toBe(null);
  });

  it("closestMatch returns null on empty list", () => {
    expect(closestMatch("abc", [])).toBe(null);
  });

  it("closestMatch invalid input → null", () => {
    expect(closestMatch(/** @type {any} */ (null), ["a"])).toBe(null);
  });
});
