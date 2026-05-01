import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  unescapeHtml,
} from "../../src/utils/html-entities.js";

describe("escapeHtml", () => {
  it("encodes the five XML entities", () => {
    expect(escapeHtml(`<a href="x">'A&B'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;A&amp;B&#39;&lt;/a&gt;",
    );
  });

  it("passes plain text untouched", () => {
    expect(escapeHtml("Hello world")).toBe("Hello world");
  });

  it("non-string → empty", () => {
    expect(escapeHtml(123)).toBe("");
    expect(escapeHtml(null)).toBe("");
  });
});

describe("unescapeHtml", () => {
  it("decodes named entities", () => {
    expect(unescapeHtml("&amp;&lt;&gt;&quot;&apos;")).toBe(`&<>"'`);
  });

  it("decodes nbsp / typographic", () => {
    expect(unescapeHtml("a&nbsp;b&mdash;c")).toBe("a\u00A0b—c");
  });

  it("decodes decimal numeric", () => {
    expect(unescapeHtml("A&#65;B")).toBe("AAB");
  });

  it("decodes hex numeric", () => {
    expect(unescapeHtml("&#x05D0;&#x05D5;")).toBe("או");
  });

  it("preserves unknown named entities", () => {
    expect(unescapeHtml("&xyz;")).toBe("&xyz;");
  });

  it("ignores out-of-range numeric", () => {
    expect(unescapeHtml("&#9999999999;")).toBe("&#9999999999;");
  });

  it("round-trips through escapeHtml", () => {
    const s = `<b>"hello" & 'world'</b>`;
    expect(unescapeHtml(escapeHtml(s))).toBe(s);
  });

  it("non-string → empty", () => {
    expect(unescapeHtml(null)).toBe("");
  });
});
