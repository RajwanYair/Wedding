import { describe, it, expect } from "vitest";
import { parseHeadings, renderToc } from "../../src/utils/markdown-toc.js";

const MD = `# Title

Intro paragraph.

## First Section

Body.

### Subsection A
### Subsection B

## Second Section

\`\`\`md
## Inside Code
\`\`\`

## Third Section
`;

describe("markdown-toc", () => {
  it("parseHeadings extracts depth/text/slug", () => {
    const heads = parseHeadings("# Hello World\n");
    expect(heads).toEqual([{ depth: 1, text: "Hello World", slug: "hello-world" }]);
  });

  it("parseHeadings handles all six levels", () => {
    const md = "# h1\n## h2\n### h3\n#### h4\n##### h5\n###### h6\n";
    const heads = parseHeadings(md);
    expect(heads.map((h) => h.depth)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("parseHeadings ignores fenced code blocks", () => {
    const heads = parseHeadings(MD);
    const texts = heads.map((h) => h.text);
    expect(texts).not.toContain("Inside Code");
    expect(texts).toContain("Third Section");
  });

  it("parseHeadings dedupes duplicate slugs", () => {
    const md = "## Same\n## Same\n## Same\n";
    const heads = parseHeadings(md);
    expect(heads.map((h) => h.slug)).toEqual(["same", "same-1", "same-2"]);
  });

  it("parseHeadings handles non-string input", () => {
    expect(parseHeadings(null)).toEqual([]);
  });

  it("parseHeadings strips trailing #", () => {
    const heads = parseHeadings("## Title ##\n");
    expect(heads[0].text).toBe("Title");
  });

  it("parseHeadings transliterates Hebrew slugs", () => {
    const heads = parseHeadings("## שלום\n");
    expect(heads[0].slug).toBe("shlvm");
  });

  it("renderToc skips h1 by default", () => {
    const md = "# Top\n## A\n### A1\n## B\n";
    const out = renderToc(parseHeadings(md));
    expect(out).not.toContain("Top");
    expect(out).toContain("- [A](#a)");
    expect(out).toContain("  - [A1](#a1)");
    expect(out).toContain("- [B](#b)");
  });

  it("renderToc indents nested levels", () => {
    const md = "## A\n### A1\n#### A1a\n";
    const out = renderToc(parseHeadings(md));
    const lines = out.split("\n");
    expect(lines[0].startsWith("- ")).toBe(true);
    expect(lines[1].startsWith("  - ")).toBe(true);
    expect(lines[2].startsWith("    - ")).toBe(true);
  });

  it("renderToc empty for no matching headings", () => {
    expect(renderToc([])).toBe("");
    expect(renderToc(parseHeadings("# only h1\n"))).toBe("");
  });

  it("renderToc honours minDepth=3", () => {
    const md = "## ignored\n### kept\n";
    const out = renderToc(parseHeadings(md), { minDepth: 3 });
    expect(out).toContain("kept");
    expect(out).not.toContain("ignored");
  });

  it("renderToc honours custom indent", () => {
    const md = "## A\n### A1\n";
    const out = renderToc(parseHeadings(md), { indent: "    " });
    expect(out.split("\n")[1].startsWith("    - ")).toBe(true);
  });
});
