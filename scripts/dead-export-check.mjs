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
 *   node scripts/dead-export-check.mjs --enforce   # exit 1 if dead exports found
 *   node scripts/dead-export-check.mjs --baseline=N # exit 1 if dead exports > N
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");

const ARGV = process.argv.slice(2);
const ARGS = new Set(ARGV);
const JSON_OUT = ARGS.has("--json");
const SUMMARY_ONLY = ARGS.has("--summary");
const ENFORCE = ARGS.has("--enforce");
const BASELINE_ARG = ARGV.find((a) => a.startsWith("--baseline="));
const BASELINE = BASELINE_ARG ? Number(BASELINE_ARG.split("=")[1]) : null;

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

// Build a corpus excluding the defining file for each symbol so we count
// only external usages. This avoids the export site (`export function sym`)
// inflating the live count, while still catching every real consumer.
const fileContents = new Map(allFiles.map((f) => [f, readFileSync(f, "utf8")]));
const fullToShort = new Map(allFiles.map((f) => [shortPath(f), f]));

for (const { sym, file } of allExports) {
  const definingAbs = fullToShort.get(file);
  // External corpus = every file except the defining one.
  let externalUses = 0;
  for (const [path, content] of fileContents) {
    if (path === definingAbs) continue;
    // 1. Static named import: import { sym } from "..."
    const staticImportRe = new RegExp(`import[^;]*\\b${sym}\\b`, "g");
    // 2. Dynamic destructured import: const { sym } = await import("...")
    //    or  const { sym } = require("..."). Match a `{` followed (across
    //    newlines, no `;`) by the symbol followed by another non-`;` run
    //    that ends at `await import(` or `require(`.
    const dynamicImportRe = new RegExp(
      `\\{[^;}]*\\b${sym}\\b[^;}]*\\}\\s*=\\s*(?:await\\s+import|require)\\s*\\(`,
      "g",
    );
    // 3. Namespace property access: ns.sym( or ns?.sym(  or  ns["sym"]
    const nsAccessRe = new RegExp(`\\.${sym}[\\s\\S]{0,2}\\(|\\[['"\`]${sym}['"\`]\\]`, "g");
    // 4. Re-export: export { sym } from "..."  or  export { sym }
    const reExportRe = new RegExp(`export\\s*\\{[^}]*\\b${sym}\\b[^}]*\\}`, "g");

    externalUses += (content.match(staticImportRe) ?? []).length;
    externalUses += (content.match(dynamicImportRe) ?? []).length;
    externalUses += (content.match(nsAccessRe) ?? []).length;
    externalUses += (content.match(reExportRe) ?? []).length;
    if (externalUses > 0) break; // early exit once a usage is found
  }
  if (externalUses === 0) dead.push({ sym, file });
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

if (ENFORCE && dead.length > 0) {
  console.error(`\n✖ --enforce: ${dead.length} dead export(s) found. Clean up before merging.`);
  process.exit(1);
}

if (BASELINE !== null && Number.isFinite(BASELINE) && dead.length > BASELINE) {
  console.error(
    `\n✖ --baseline=${BASELINE}: ${dead.length} dead export(s) found (regression of ${dead.length - BASELINE}). Clean up new dead exports before merging.`,
  );
  process.exit(1);
}
