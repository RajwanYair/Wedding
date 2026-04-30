import { describe, it, expect } from "vitest";
import {
  levenshtein,
  similarity,
  search,
} from "../../src/utils/fuzzy-match.js";

describe("fuzzy-match", () => {
  it("levenshtein zero for equal strings", () => {
    expect(levenshtein("hello", "hello")).toBe(0);
  });

  it("levenshtein distance for substitutions", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });

  it("levenshtein full length when other empty", () => {
    expect(levenshtein("abc", "")).toBe(3);
    expect(levenshtein("", "abcd")).toBe(4);
  });

  it("levenshtein Infinity for non-strings", () => {
    expect(levenshtein(null, "x")).toBe(Infinity);
  });

  it("similarity 1 for identical", () => {
    expect(similarity("Hello", "hello")).toBe(1);
  });

  it("similarity 0 for fully disjoint same length", () => {
    expect(similarity("abcd", "wxyz")).toBe(0);
  });

  it("similarity normalises whitespace/case", () => {
    expect(similarity("  Alice  ", "alice")).toBe(1);
  });

  it("similarity 1 for both empty", () => {
    expect(similarity("", "")).toBe(1);
  });

  it("search returns sorted matches", () => {
    const out = search("alice", ["Alice", "Alicia", "Bob", "Aliace"]);
    expect(out[0].value).toBe("Alice");
  });

  it("search applies threshold", () => {
    const out = search("alice", ["Bob", "Charlie"], { threshold: 0.5 });
    expect(out).toHaveLength(0);
  });

  it("search applies limit", () => {
    const out = search("a", ["a", "ab", "abc", "abcd"], { limit: 2 });
    expect(out).toHaveLength(2);
  });

  it("search ignores non-string candidates", () => {
    const out = search("x", ["x", null, undefined, 42]);
    expect(out.map((r) => r.value)).toEqual(["x"]);
  });

  it("search ties broken alphabetically", () => {
    const out = search("foo", ["foz", "fob"]);
    expect(out[0].value).toBe("fob");
  });
});
