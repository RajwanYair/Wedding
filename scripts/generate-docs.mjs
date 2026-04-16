#!/usr/bin/env node
// scripts/generate-docs.mjs — F5.1.1 Auto-generate API docs from JSDoc
//
// Scans src/**\/*.js for exported functions, extracts JSDoc comments,
// and generates a single docs/API.md Markdown file.
//
// Zero deps — uses only Node built-in modules.
//
// Usage: node scripts/generate-docs.mjs

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, relative, extname } from "node:path";

const SRC_DIR = join(import.meta.dirname, "..", "src");
const OUT_FILE = join(import.meta.dirname, "..", "docs", "API.md");

/**
 * Recursively collect all .js files under a directory.
 * @param {string} dir
 * @returns {string[]}
 */
function collectJsFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectJsFiles(full));
    } else if (extname(full) === ".js") {
      files.push(full);
    }
  }
  return files;
}

/**
 * Extract exported functions with JSDoc from a source file.
 * @param {string} filePath
 * @returns {{ name: string, jsdoc: string, signature: string, line: number }[]}
 */
function extractExports(filePath) {
  const source = readFileSync(filePath, "utf-8");
  const lines = source.split("\n");
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match: export function name(...)
    // Match: export async function name(...)
    const match = line.match(/^export\s+(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
    if (!match) continue;

    const name = match[2];
    const params = match[3].trim();
    const isAsync = Boolean(match[1]);
    const signature = `${isAsync ? "async " : ""}function ${name}(${params})`;

    // Walk backwards to find JSDoc block
    let jsdoc = "";
    let j = i - 1;
    if (j >= 0 && lines[j].trim() === "*/") {
      const docLines = [];
      while (j >= 0 && !lines[j].trim().startsWith("/**")) {
        docLines.unshift(lines[j]);
        j--;
      }
      if (j >= 0) docLines.unshift(lines[j]);
      jsdoc = docLines
        .map((l) => l.trim())
        .map((l) => l.replace(/^\/\*\*\s?/, "").replace(/^\*\/?\s?/, "").replace(/^\*\s?/, ""))
        .filter((l) => l.length > 0)
        .join("\n");
    }

    results.push({ name, jsdoc, signature, line: i + 1 });
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────

const files = collectJsFiles(SRC_DIR).sort();
const sections = [];

for (const file of files) {
  const exports = extractExports(file);
  if (exports.length === 0) continue;

  const relPath = relative(join(import.meta.dirname, ".."), file).replace(/\\/g, "/");
  const lines = [`### \`${relPath}\`\n`];

  for (const exp of exports) {
    lines.push(`#### \`${exp.signature}\``);
    lines.push(`> Line ${exp.line}\n`);
    if (exp.jsdoc) {
      lines.push(exp.jsdoc);
    }
    lines.push("");
  }

  sections.push(lines.join("\n"));
}

const md = `# Wedding Manager — API Reference

> Auto-generated from JSDoc by \`scripts/generate-docs.mjs\`
> Generated: ${new Date().toISOString().split("T")[0]}

## Table of Contents

${files
  .filter((f) => extractExports(f).length > 0)
  .map((f) => {
    const rel = relative(join(import.meta.dirname, ".."), f).replace(/\\/g, "/");
    const anchor = rel.replace(/[^a-zA-Z0-9]/g, "");
    return `- [\`${rel}\`](#${anchor})`;
  })
  .join("\n")}

---

${sections.join("\n---\n\n")}
`;

// Ensure docs/ directory exists
mkdirSync(join(import.meta.dirname, "..", "docs"), { recursive: true });
writeFileSync(OUT_FILE, md, "utf-8");

const totalExports = files.reduce((s, f) => s + extractExports(f).length, 0);
console.log(`✅ Generated docs/API.md — ${totalExports} exports from ${sections.length} modules`);
