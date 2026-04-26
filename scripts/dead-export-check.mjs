#!/usr/bin/env node
/**
 * scripts/dead-export-check.mjs — Dead export audit (S21a)
 *
 * Scans src/ for exported symbols that are never referenced in any import
 * statement across src/, tests/, and scripts/.
 *
 * Usage:
 *   node scripts/dead-export-check.mjs             # print report
 *   node scripts/dead-export-check.mjs --json      # JSON output
 *   node scripts/dead-export-check.mjs --summary   # only totals
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");

const ARGS = new Set(process.argv.slice(2));
const JSON_OUT = ARGS.has("--json");
const SUMMARY_ONLY = ARGS.has("--summary");

// ── Helpers ────────────────────────────────────────────────────────────────

/** @param {string} dir @returns {string[]} */
function getAllJs(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllJs(full));
    else if (entry.name.endsWith(".js") || entry.name.endsWith(".mjs")) results.push(full);
  }
  return results;
}

/** @param {string} path @returns {string} */
function shortPath(p) {
  return p.replace(`${ROOT}/`, "").replace(/\\/g, "/");
}

// ── Corpus ─────────────────────────────────────────────────────────────────

const srcFiles = getAllJs(join(ROOT, "src"));
const testFiles = getAllJs(join(ROOT, "tests"));
const scriptFiles = getAllJs(join(ROOT, "scripts"));
const allFiles = [...srcFiles, ...testFiles, ...scriptFiles];

const corpus = allFiles.map((f) => readFileSync(f, "utf8")).join("\n");

// ── Export discovery ────────────────────────────────────────────────────────

const EXPORT_RE = /^export (?:(?:async )?function|const|class|let) ([a-zA-Z_$][a-zA-Z0-9_$]*)/gm;

/** @type {Array<{sym: string, file: string}>} */
const allExports = [];

for (const f of srcFiles) {
  const content = readFileSync(f, "utf8");
  let m;
  while ((m = EXPORT_RE.exec(content)) !== null) {
    allExports.push({ sym: m[1], file: shortPath(f) });
  }
}

// ── Import reference check ──────────────────────────────────────────────────

/** @type {Array<{sym: string, file: string}>} */
const dead = [];

for (const { sym, file } of allExports) {
  // 1. Named import: import { sym } from ...
  const importRe = new RegExp(`import[^;]*\\b${sym}\\b`, "g");
  const importCount = (corpus.match(importRe) ?? []).length;
  // 2. Namespace property access: ns.sym( or ns?.sym(
  const nsAccessRe = new RegExp(`\\.${sym}[\\s\\S]{0,2}\\(|\\[['"\`]${sym}['"\`]\\]`, "g");
  const nsAccessCount = (corpus.match(nsAccessRe) ?? []).length;
  if (importCount === 0 && nsAccessCount === 0) dead.push({ sym, file });
}

// ── Report ─────────────────────────────────────────────────────────────────

if (JSON_OUT) {
  process.stdout.write(`${JSON.stringify(dead, null, 2)}\n`);
  process.exit(0);
}

/** @type {Record<string, string[]>} */
const byDir = {};
for (const { sym, file } of dead) {
  const dir = file.split("/").slice(0, 2).join("/");
  (byDir[dir] ??= []).push(`${file} → ${sym}`);
}

console.log(`\n=== Dead Export Audit ===`);
console.log(`Scanned: ${allExports.length} exports in ${srcFiles.length} source files`);
console.log(`Dead (no import found): ${dead.length}`);
console.log(`Live (imported somewhere): ${allExports.length - dead.length}\n`);

if (SUMMARY_ONLY) process.exit(0);

for (const [dir, entries] of Object.entries(byDir).sort()) {
  console.log(`\n── ${dir} (${entries.length}) ──`);
  for (const e of entries) console.log(`  ${e}`);
}

console.log(`\nNote: exports used only via barrel re-export (export * from) or`);
console.log(`accessed exclusively by string key (e.g. obj["sym"]) may still`);
console.log(`appear dead. Review before removing.\n`);
