#!/usr/bin/env node
/**
 * validate-mermaid.mjs — lightweight syntax validator for ```mermaid blocks
 * embedded in markdown. Catches the most common breakage classes without
 * pulling in mermaid-cli + puppeteer (~250 MB).
 *
 * Checks per block:
 *   1. Non-empty body
 *   2. First non-comment line declares a known diagram type
 *   3. Brackets/braces/parens are balanced (string-literal aware)
 *   4. At least one edge or node line beyond the type declaration
 *
 * Usage: node scripts/validate-mermaid.mjs [--enforce]
 *        Files scanned: *.md and docs/** *.md (recursive).
 */

import { readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { walk } from "./lib/file-walker.mjs";
import { parseAuditArgs } from "./lib/audit-utils.mjs";

const ROOT = process.cwd();
const { enforce: ENFORCE } = parseAuditArgs();

const TARGETS = [
  "ARCHITECTURE.md",
  "README.md",
  "ROADMAP.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "AGENTS.md",
  "SECURITY.md",
];

const KNOWN_TYPES = new Set([
  "graph",
  "flowchart",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "quadrantChart",
  "gitGraph",
  "C4Context",
  "C4Container",
  "C4Component",
  "block-beta",
  "sankey-beta",
  "xychart-beta",
  "requirementDiagram",
]);

const PAIRS = { ")": "(", "]": "[", "}": "{" };

/**
 * Validate one mermaid block body. Returns null on success, error string otherwise.
 * @param {string} body
 * @returns {string|null}
 */
function validateBlock(body) {
  const lines = body.split(/\r?\n/);
  const meaningful = lines.map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("%%"));

  if (meaningful.length === 0) return "empty mermaid block";

  // Diagram type may be on first line, optionally with a direction (e.g. "graph TD").
  const first = meaningful[0];
  const head = first.split(/\s+/)[0];
  if (!KNOWN_TYPES.has(head)) {
    return `unknown diagram type "${head}" on first line`;
  }

  if (meaningful.length < 2) {
    return "diagram has only a type declaration (no nodes/edges)";
  }

  // erDiagram uses `}o--||` cardinality syntax that confuses the
  // bracket-balance check. Diagram-type-specific grammar is out of scope
  // for a syntax-only validator, so skip the balance pass for ER.
  if (head === "erDiagram") return null;

  // Bracket balance, ignoring contents of "..." and '...' string literals.
  const stack = [];
  let inStr = null; // '"' | "'" | null
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      if (c === inStr && body[i - 1] !== "\\") inStr = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") {
      stack.push(c);
    } else if (c === ")" || c === "]" || c === "}") {
      const want = PAIRS[c];
      const top = stack.pop();
      if (top !== want) {
        return `unbalanced "${c}" (expected match for "${top ?? "<empty>"}")`;
      }
    }
  }
  if (stack.length > 0) return `unclosed "${stack.join("")}"`;

  return null;
}

/**
 * Extract mermaid code blocks from markdown source.
 * @param {string} src
 * @returns {Array<{ line: number, body: string }>}
 */
function extractBlocks(src) {
  const out = [];
  const lines = src.split(/\r?\n/);
  let inBlock = false;
  let start = -1;
  let buf = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (!inBlock && /^```mermaid\s*$/i.test(ln)) {
      inBlock = true;
      start = i + 2; // 1-based first content line
      buf = [];
      continue;
    }
    if (inBlock && /^```\s*$/.test(ln)) {
      out.push({ line: start, body: buf.join("\n") });
      inBlock = false;
      continue;
    }
    if (inBlock) buf.push(ln);
  }
  return out;
}

const files = [];
for (const t of TARGETS) {
  files.push(join(ROOT, t));
}
for (const dir of ["docs", ".github"]) {
  const abs = join(ROOT, dir);
  try {
    for (const f of walk(abs, ".md")) files.push(f);
  } catch {
    /* dir missing — skip */
  }
}

let totalBlocks = 0;
const violations = [];
for (const file of files) {
  let src;
  try {
    src = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const rel = relative(ROOT, file).split(sep).join("/");
  const blocks = extractBlocks(src);
  totalBlocks += blocks.length;
  for (const b of blocks) {
    const err = validateBlock(b.body);
    if (err) violations.push({ file: rel, line: b.line, err });
  }
}

console.log(
  `[validate-mermaid] scanned ${files.length} files, ${totalBlocks} mermaid block(s); ${violations.length} violation(s).`,
);
for (const v of violations) {
  console.log(`  ${v.file}:${v.line}  ${v.err}`);
}

if (ENFORCE && violations.length > 0) {
  console.log(`\n[validate-mermaid] ENFORCE: failing on ${violations.length} violations.`);
  process.exit(1);
}
process.exit(0);
