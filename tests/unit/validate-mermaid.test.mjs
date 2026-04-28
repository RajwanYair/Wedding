/**
 * tests/unit/validate-mermaid.test.mjs — S166
 *
 * Unit tests for the mermaid block validator logic embedded in
 * scripts/validate-mermaid.mjs. Tests are self-contained; the
 * extraction + validation logic is reproduced here (DRY trade-off:
 * the script runs in a Node CLI context with process.exit() calls that
 * complicate direct import, so we inline the pure helpers).
 */

import { describe, it, expect } from "vitest";

// ── Reproduced pure helpers from validate-mermaid.mjs ─────────────────────

const KNOWN_TYPES = new Set([
  "graph", "flowchart", "sequenceDiagram", "classDiagram",
  "stateDiagram", "stateDiagram-v2", "erDiagram", "journey",
  "gantt", "pie", "mindmap", "timeline", "quadrantChart",
  "gitGraph", "C4Context", "C4Container", "C4Component",
  "block-beta", "sankey-beta", "xychart-beta", "requirementDiagram",
]);

const PAIRS = { ")": "(", "]": "[", "}": "{" };

/**
 * @param {string} body
 * @returns {string|null}
 */
function validateBlock(body) {
  const lines = body.split(/\r?\n/);
  const meaningful = lines.map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("%%"));

  if (meaningful.length === 0) return "empty mermaid block";

  const first = meaningful[0];
  const head = first.split(/\s+/)[0];
  if (!KNOWN_TYPES.has(head)) {
    return `unknown diagram type "${head}" on first line`;
  }

  if (meaningful.length < 2) {
    return "diagram has only a type declaration (no nodes/edges)";
  }

  if (head === "erDiagram") return null;

  const stack = [];
  let inStr = null;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      if (c === inStr && body[i - 1] !== "\\") inStr = null;
      continue;
    }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === "(" || c === "[" || c === "{") { stack.push(c); }
    else if (c === ")" || c === "]" || c === "}") {
      const want = PAIRS[c];
      const top = stack.pop();
      if (top !== want) return `unbalanced "${c}" (expected match for "${top ?? "<empty>"}")`;
    }
  }
  if (stack.length > 0) return `unclosed "${stack.join("")}"`;
  return null;
}

/**
 * @param {string} src
 * @returns {Array<{line: number, body: string}>}
 */
function extractBlocks(src) {
  const out = [];
  const lines = src.split(/\r?\n/);
  let inBlock = false, start = -1, buf = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (!inBlock && /^```mermaid\s*$/i.test(ln)) { inBlock = true; start = i + 2; buf = []; continue; }
    if (inBlock && /^```\s*$/.test(ln)) { out.push({ line: start, body: buf.join("\n") }); inBlock = false; continue; }
    if (inBlock) buf.push(ln);
  }
  return out;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("validateBlock — valid diagrams", () => {
  it("accepts a valid flowchart", () => {
    const body = `flowchart TD\n  A --> B`;
    expect(validateBlock(body)).toBeNull();
  });

  it("accepts a sequenceDiagram", () => {
    const body = `sequenceDiagram\n  Alice->>Bob: Hello`;
    expect(validateBlock(body)).toBeNull();
  });

  it("accepts a graph with brackets", () => {
    const body = `graph LR\n  A[Start] --> B{Decision}\n  B -->|yes| C[End]`;
    expect(validateBlock(body)).toBeNull();
  });

  it("accepts erDiagram (bracket check skipped)", () => {
    const body = `erDiagram\n  CUSTOMER }o--|| ORDER : places`;
    expect(validateBlock(body)).toBeNull();
  });

  it("ignores comment lines (%%)", () => {
    const body = `%% This is a comment\nflowchart TD\n  A --> B`;
    expect(validateBlock(body)).toBeNull();
  });

  it("accepts pie chart", () => {
    const body = `pie\n  "HE" : 60\n  "EN" : 40`;
    expect(validateBlock(body)).toBeNull();
  });
});

describe("validateBlock — invalid diagrams", () => {
  it("rejects empty block", () => {
    expect(validateBlock("   \n  ")).toBe("empty mermaid block");
  });

  it("rejects unknown diagram type", () => {
    const result = validateBlock("unknownType\n  A --> B");
    expect(result).toMatch(/unknown diagram type/);
  });

  it("rejects block with only type declaration", () => {
    expect(validateBlock("flowchart TD")).toBe("diagram has only a type declaration (no nodes/edges)");
  });

  it("rejects unbalanced brackets", () => {
    const body = `graph TD\n  A[Open --> B`;
    expect(validateBlock(body)).toBeTruthy();
  });

  it("rejects unclosed brace", () => {
    const body = `graph TD\n  A{Open --> B`;
    const result = validateBlock(body);
    expect(result).toMatch(/unclosed/);
  });
});

describe("extractBlocks", () => {
  it("extracts zero blocks from plain text", () => {
    expect(extractBlocks("No mermaid here")).toHaveLength(0);
  });

  it("extracts one block", () => {
    const md = "text\n```mermaid\ngraph TD\n  A --> B\n```\nend";
    const blocks = extractBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].body).toContain("graph TD");
  });

  it("extracts multiple blocks", () => {
    const md = [
      "```mermaid", "graph TD", "  A-->B", "```",
      "middle",
      "```mermaid", "sequenceDiagram", "  A->>B: hi", "```",
    ].join("\n");
    expect(extractBlocks(md)).toHaveLength(2);
  });

  it("records correct 1-based line numbers", () => {
    const md = "line1\n```mermaid\ngraph TD\n  A-->B\n```";
    const [block] = extractBlocks(md);
    expect(block.line).toBe(3); // line 2 = fence, line 3 = first content
  });
});

describe("end-to-end: extract + validate", () => {
  it("valid markdown produces 0 violations", () => {
    const md = [
      "# Title",
      "```mermaid",
      "sequenceDiagram",
      "  Alice->>Bob: RSVP",
      "  Bob-->>Alice: Confirmed",
      "```",
    ].join("\n");
    const violations = extractBlocks(md).map((b) => validateBlock(b.body)).filter(Boolean);
    expect(violations).toHaveLength(0);
  });

  it("bad markdown produces violations", () => {
    const md = ["```mermaid", "badType", "  A --> B", "```"].join("\n");
    const violations = extractBlocks(md).map((b) => validateBlock(b.body)).filter(Boolean);
    expect(violations).toHaveLength(1);
  });
});
