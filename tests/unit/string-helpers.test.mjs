/**
 * tests/unit/string-helpers.test.mjs — Sprint 165
 */

import { describe, it, expect } from "vitest";
import {
  capitalize,
  toTitleCase,
  truncate,
  slugify,
  padStart,
  countOccurrences,
  isBlank,
  normalizeForSearch,
  escapeRegex,
  interpolate,
} from "../../src/utils/string-helpers.js";

describe("capitalize", () => {
  it("capitalizes first letter", () => expect(capitalize("hello")).toBe("Hello"));
  it("handles empty string", () => expect(capitalize("")).toBe(""));
  it("handles already capitalized", () => expect(capitalize("World")).toBe("World"));
});

describe("toTitleCase", () => {
  it("capitalizes each word", () => expect(toTitleCase("hello world")).toBe("Hello World"));
  it("handles single word", () => expect(toTitleCase("alice")).toBe("Alice"));
});

describe("truncate", () => {
  it("does not truncate short strings", () => expect(truncate("abc", 5)).toBe("abc"));
  it("truncates and adds ellipsis", () => expect(truncate("hello world", 5)).toBe("hello…"));
  it("accepts custom ellipsis", () => expect(truncate("hello world", 5, "...")).toBe("hello..."));
  it("exact length is not truncated", () => expect(truncate("12345", 5)).toBe("12345"));
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => expect(slugify("Hello World")).toBe("hello-world"));
  it("removes special characters", () => expect(slugify("foo@bar!")).toBe("foobar"));
  it("collapses multiple hyphens", () => expect(slugify("foo   bar")).toBe("foo-bar"));
  it("trims leading/trailing hyphens", () => expect(slugify("  test  ")).toBe("test"));
});

describe("padStart", () => {
  it("pads a number", () => expect(padStart(5, 3)).toBe("005"));
  it("does not pad if already long enough", () => expect(padStart(123, 3)).toBe("123"));
  it("custom pad char", () => expect(padStart("1", 4, " ")).toBe("   1"));
});

describe("countOccurrences", () => {
  it("counts substring occurrences", () => expect(countOccurrences("abcabc", "abc")).toBe(2));
  it("returns 0 for no match", () => expect(countOccurrences("hello", "xyz")).toBe(0));
  it("returns 0 for empty needle", () => expect(countOccurrences("hello", "")).toBe(0));
  it("handles overlapping correctly", () => expect(countOccurrences("aaa", "aa")).toBe(1));
});

describe("isBlank", () => {
  it("returns true for null", () => expect(isBlank(null)).toBe(true));
  it("returns true for undefined", () => expect(isBlank(undefined)).toBe(true));
  it("returns true for empty string", () => expect(isBlank("")).toBe(true));
  it("returns true for whitespace only", () => expect(isBlank("   ")).toBe(true));
  it("returns false for non-empty string", () => expect(isBlank("hello")).toBe(false));
});

describe("normalizeForSearch", () => {
  it("lowercases the string", () => expect(normalizeForSearch("Hello")).toBe("hello"));
  it("strips Latin accents", () => expect(normalizeForSearch("café")).toBe("cafe"));
  it("trims whitespace", () => expect(normalizeForSearch("  foo  ")).toBe("foo"));
});

describe("escapeRegex", () => {
  it("escapes special regex chars", () => {
    const escaped = escapeRegex("a.b*c?d");
    expect(new RegExp(escaped).test("a.b*c?d")).toBe(true);
    expect(new RegExp(escaped).test("axbxcxd")).toBe(false);
  });
  it("handles empty string", () => expect(escapeRegex("")).toBe(""));
});

describe("interpolate", () => {
  it("replaces placeholders", () =>
    expect(interpolate("Hello {{name}}!", { name: "Alice" })).toBe("Hello Alice!"));
  it("leaves unknown placeholders", () =>
    expect(interpolate("{{a}} {{b}}", { a: "1" })).toBe("1 {{b}}"));
  it("handles empty vars", () =>
    expect(interpolate("{{x}}", {})).toBe("{{x}}"));
});
