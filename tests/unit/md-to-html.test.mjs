/**
 * tests/unit/md-to-html.test.mjs — Sprint 214
 *
 * Unit tests for src/utils/md-to-html.js
 * Coverage: mdToHtml — heading levels, list open/close, paragraphs,
 *           inline bold, inline code, HTML escaping, edge cases.
 */

import { describe, it, expect } from "vitest";
import { mdToHtml } from "../../src/utils/md-to-html.js";

// ── Headings ──────────────────────────────────────────────────────────────

describe("mdToHtml headings", () => {
  it("converts # to <h2>", () => {
    expect(mdToHtml("# Hello")).toBe("<h2>Hello</h2>");
  });

  it("converts ## to <h3>", () => {
    expect(mdToHtml("## World")).toBe("<h3>World</h3>");
  });

  it("converts ### to <h4>", () => {
    expect(mdToHtml("### Deep")).toBe("<h4>Deep</h4>");
  });

  it("converts #### to <h5>", () => {
    expect(mdToHtml("#### Deeper")).toBe("<h5>Deeper</h5>");
  });

  it("does not treat ##### as a heading (only 1–4 # supported)", () => {
    // 5 hashes: no match — falls through to paragraph
    const output = mdToHtml("##### Five");
    expect(output).toBe("<p>##### Five</p>");
  });

  it("HTML-escapes heading text", () => {
    expect(mdToHtml("# foo & <bar>")).toBe("<h2>foo &amp; &lt;bar&gt;</h2>");
  });
});

// ── Lists ─────────────────────────────────────────────────────────────────

describe("mdToHtml lists", () => {
  it("wraps consecutive list items in <ul>", () => {
    const md = "- alpha\n- beta\n- gamma";
    const html = mdToHtml(md);
    expect(html).toContain("<ul>");
    expect(html).toContain("</ul>");
    expect(html.match(/<li>/g)).toHaveLength(3);
  });

  it("closes list before a heading", () => {
    const md = "- item\n## Section";
    const html = mdToHtml(md);
    const ulClose = html.indexOf("</ul>");
    const h3 = html.indexOf("<h3>");
    expect(ulClose).toBeLessThan(h3);
  });

  it("closes list at end of input", () => {
    expect(mdToHtml("- only")).toBe("<ul>\n<li>only</li>\n</ul>");
  });

  it("closes list before a paragraph", () => {
    const html = mdToHtml("- item\nsome text");
    expect(html.indexOf("</ul>")).toBeLessThan(html.indexOf("<p>"));
  });

  it("HTML-escapes list item text", () => {
    const html = mdToHtml("- foo & <bar>");
    expect(html).toContain("<li>foo &amp; &lt;bar&gt;</li>");
  });
});

// ── Paragraphs ────────────────────────────────────────────────────────────

describe("mdToHtml paragraphs", () => {
  it("wraps plain text in <p>", () => {
    expect(mdToHtml("Hello world")).toBe("<p>Hello world</p>");
  });

  it("HTML-escapes paragraph text", () => {
    expect(mdToHtml("a > b && c < d")).toBe("<p>a &gt; b &amp;&amp; c &lt; d</p>");
  });

  it("skips blank lines silently", () => {
    const html = mdToHtml("para1\n\npara2");
    expect(html).toBe("<p>para1</p>\n<p>para2</p>");
  });
});

// ── Inline formatting ─────────────────────────────────────────────────────

describe("mdToHtml inline bold", () => {
  it("converts **text** to <strong>text</strong>", () => {
    expect(mdToHtml("**bold** word")).toBe("<p><strong>bold</strong> word</p>");
  });

  it("handles multiple bold spans in one line", () => {
    const html = mdToHtml("**a** and **b**");
    expect(html).toBe("<p><strong>a</strong> and <strong>b</strong></p>");
  });

  it("preserves surrounding text", () => {
    const html = mdToHtml("before **mid** after");
    expect(html).toBe("<p>before <strong>mid</strong> after</p>");
  });
});

describe("mdToHtml inline code", () => {
  it("converts `code` to <code>code</code>", () => {
    expect(mdToHtml("use `npm test`")).toBe("<p>use <code>npm test</code></p>");
  });

  it("handles multiple code spans", () => {
    const html = mdToHtml("`a` and `b`");
    expect(html).toBe("<p><code>a</code> and <code>b</code></p>");
  });
});

// ── Combined formatting ───────────────────────────────────────────────────

describe("mdToHtml combined", () => {
  it("handles heading + list + paragraph", () => {
    const md = [
      "# Title",
      "- first",
      "- second",
      "",
      "Footer text",
    ].join("\n");
    const html = mdToHtml(md);
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>first</li>");
    expect(html).toContain("</ul>");
    expect(html).toContain("<p>Footer text</p>");
  });

  it("handles bold inside a list item", () => {
    const html = mdToHtml("- **important** step");
    expect(html).toContain("<strong>important</strong>");
  });

  it("handles code inside a heading", () => {
    const html = mdToHtml("## Run `npm install`");
    expect(html).toContain("<h3>Run <code>npm install</code></h3>");
  });
});

// ── Security / edge cases ────────────────────────────────────────────────

describe("mdToHtml security", () => {
  it("escapes < and > in paragraph text", () => {
    const html = mdToHtml("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes quotes", () => {
    const html = mdToHtml(`say "hello"`);
    expect(html).toContain("&quot;hello&quot;");
  });

  it("returns empty string for empty input", () => {
    expect(mdToHtml("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(mdToHtml("   \n\n  ")).toBe("");
  });
});
