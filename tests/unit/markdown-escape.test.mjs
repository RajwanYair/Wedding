import { describe, it, expect } from "vitest";
import {
  escapeMarkdown,
  escapeInlineCode,
  escapeTableCell,
} from "../../src/utils/markdown-escape.js";

describe("markdown-escape", () => {
  it("escapes asterisks and underscores", () => {
    expect(escapeMarkdown("a*b_c")).toBe("a\\*b\\_c");
  });

  it("escapes brackets and parens", () => {
    expect(escapeMarkdown("[link](url)")).toBe("\\[link\\]\\(url\\)");
  });

  it("escapes backslash and backtick", () => {
    expect(escapeMarkdown("a\\b`c")).toBe("a\\\\b\\`c");
  });

  it("escapes pipe, hash, plus", () => {
    expect(escapeMarkdown("a|b#c+d")).toBe("a\\|b\\#c\\+d");
  });

  it("non-string → empty", () => {
    expect(escapeMarkdown(/** @type {any} */ (null))).toBe("");
  });

  it("inline code wraps with backticks", () => {
    expect(escapeInlineCode("hello")).toBe("`hello`");
  });

  it("inline code escalates fence for embedded backticks", () => {
    expect(escapeInlineCode("foo `bar` baz")).toBe("``foo `bar` baz``");
  });

  it("inline code pads when starts with backtick", () => {
    expect(escapeInlineCode("`code`")).toBe("`` `code` ``");
  });

  it("inline code on non-string returns empty fences", () => {
    expect(escapeInlineCode(/** @type {any} */ (null))).toBe("``");
  });

  it("table cell escapes pipes", () => {
    expect(escapeTableCell("a | b")).toBe("a \\| b");
  });

  it("table cell flattens newlines", () => {
    expect(escapeTableCell("a\nb\r\nc")).toBe("a b c");
  });

  it("table cell on non-string returns empty", () => {
    expect(escapeTableCell(/** @type {any} */ (null))).toBe("");
  });
});
