/**
 * tests/unit/text-highlight.test.mjs — Sprint 201
 */

import { describe, it, expect } from "vitest";
import {
  highlight,
  highlightTerms,
  removeHighlight,
  excerpt,
  containsQuery,
  relevanceScore,
} from "../../src/utils/text-highlight.js";

describe("highlight", () => {
  it("wraps matches in <mark>", () => {
    expect(highlight("Hello World", "world")).toBe("Hello <mark>World</mark>");
  });
  it("returns escaped html for empty query", () => {
    expect(highlight("Hello <b>", "")).toBe("Hello &lt;b&gt;");
  });
  it("returns empty string for empty text", () => {
    expect(highlight("", "foo")).toBe("");
  });
  it("is case-insensitive by default", () => {
    expect(highlight("HELLO", "hello")).toBe("<mark>HELLO</mark>");
  });
  it("respects caseSensitive option", () => {
    expect(highlight("Hello", "hello", { caseSensitive: true })).toBe("Hello");
  });
  it("highlights multiple occurrences", () => {
    const r = highlight("abc abc", "abc");
    expect(r).toBe("<mark>abc</mark> <mark>abc</mark>");
  });
  it("escapes HTML in text", () => {
    expect(highlight("a<b>c", "c")).toContain("&lt;b&gt;");
  });
  it("uses custom tag", () => {
    expect(highlight("foo", "foo", { tag: "strong" })).toBe("<strong>foo</strong>");
  });
});

describe("highlightTerms", () => {
  it("highlights all terms", () => {
    const r = highlightTerms("John Smith", ["john", "smith"]);
    expect(r).toContain("<mark>John</mark>");
    expect(r).toContain("<mark>Smith</mark>");
  });
  it("returns escaped text for empty terms array", () => {
    expect(highlightTerms("Hello", [])).toBe("Hello");
  });
  it("returns empty string for empty text", () => {
    expect(highlightTerms("", ["foo"])).toBe("");
  });
});

describe("removeHighlight", () => {
  it("removes mark tags", () => {
    expect(removeHighlight("<mark>foo</mark> bar")).toBe("foo bar");
  });
  it("removes custom tags", () => {
    expect(removeHighlight("<strong>foo</strong>", "strong")).toBe("foo");
  });
  it("no-op on plain text", () => {
    expect(removeHighlight("plain text")).toBe("plain text");
  });
});

describe("excerpt", () => {
  it("returns excerpt around match", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const result = excerpt(text, "fox", { radius: 10 });
    expect(result).toContain("fox");
  });
  it("returns start of text if no match", () => {
    const result = excerpt("Hello World", "xyz", { radius: 5 });
    expect(result.length).toBeLessThanOrEqual(12);
  });
  it("returns empty for empty text", () => {
    expect(excerpt("", "foo")).toBe("");
  });
  it("adds leading ellipsis when trimmed from start", () => {
    const text = "a".repeat(200) + "match" + "b".repeat(200);
    const r = excerpt(text, "match", { radius: 5, ellipsis: "…" });
    expect(r.startsWith("…")).toBe(true);
  });
});

describe("containsQuery", () => {
  it("returns true for matching text", () => {
    expect(containsQuery("Hello World", "world")).toBe(true);
  });
  it("returns false for no match", () => {
    expect(containsQuery("Hello", "xyz")).toBe(false);
  });
  it("respects caseSensitive", () => {
    expect(containsQuery("Hello", "hello", { caseSensitive: true })).toBe(false);
  });
  it("returns false for empty query", () => {
    expect(containsQuery("Hello", "")).toBe(false);
  });
});

describe("relevanceScore", () => {
  it("exact match → 1", () => {
    expect(relevanceScore("hello", "hello")).toBe(1);
  });
  it("starts-with → 0.9", () => {
    expect(relevanceScore("hello world", "hello")).toBe(0.9);
  });
  it("contains → 0.6", () => {
    expect(relevanceScore("say hello there", "hello")).toBe(0.6);
  });
  it("no match → 0", () => {
    expect(relevanceScore("goodbye", "hello")).toBe(0);
  });
  it("empty text → 0", () => {
    expect(relevanceScore("", "hello")).toBe(0);
  });
});
