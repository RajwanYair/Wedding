#!/usr/bin/env node
/**
 * scripts/audit-router-usage.mjs — Advisory scan for ADR-025 R1 router migration.
 *
 * Tracks two metrics:
 *   1. Direct `location.hash = …` writes — should migrate to `navigate()`.
 *   2. Direct `history.pushState`/`history.replaceState` outside the router module.
 *
 * Advisory mode (default): always exits 0.
 * Pass `--enforce` to exit 1 on any violation (target: v12.0.0).
 *
 * Output: a per-file table of violations, plus a summary.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src";
const ENFORCE = process.argv.includes("--enforce");

const PATTERNS = [
  {
    name: "location.hash assignment",
    re: /\blocation\.hash\s*=/g,
    fixHint: "Use navigate(name) from src/core/router.js",
  },
  {
    name: "history.pushState",
    re: /\bhistory\.pushState\s*\(/g,
    fixHint: "Use navigate(name, params) from src/core/router.js",
  },
  {
    name: "history.replaceState",
    re: /\bhistory\.replaceState\s*\(/g,
    fixHint: "Use navigate(name, params, { replace: true }) from src/core/router.js",
  },
];

const ALLOWLIST = new Set([
  // Authoritative router modules.
  "src/core/router.js",
  "src/core/nav.js",
]);

/**
 * @param {string} dir
 * @returns {Generator<string>}
 */
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (name.endsWith(".js")) yield p;
  }
}

/** @type {{file: string, line: number, pattern: string, snippet: string, fixHint: string}[]} */
const violations = [];

for (const file of walk(ROOT)) {
  const rel = relative(".", file).replace(/\\/g, "/");
  if (ALLOWLIST.has(rel)) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const { name, re, fixHint } of PATTERNS) {
      re.lastIndex = 0;
      if (re.test(line)) {
        violations.push({
          file: rel,
          line: idx + 1,
          pattern: name,
          snippet: line.trim().slice(0, 100),
          fixHint,
        });
      }
    }
  });
}

if (violations.length === 0) {
  console.log("[audit-router-usage] OK — no direct hash/pushState writes outside router modules.");
  process.exit(0);
}

console.log(`[audit-router-usage] Found ${violations.length} call site(s) to migrate (ADR-025 R1):`);
console.log();
for (const v of violations) {
  console.log(`  ${v.file}:${v.line}  ${v.pattern}`);
  console.log(`    > ${v.snippet}`);
  console.log(`    fix: ${v.fixHint}`);
}
console.log();
const BASELINE_ARG = process.argv.find((a) => a.startsWith("--baseline="));
const BASELINE = BASELINE_ARG ? Number(BASELINE_ARG.split("=")[1]) : null;
if (BASELINE !== null && Number.isFinite(BASELINE)) {
  if (violations.length > BASELINE) {
    console.log(`[audit-router-usage] BASELINE ${BASELINE}: ${violations.length} call site(s) (regression). Failing.`);
    process.exit(1);
  }
  console.log(`[audit-router-usage] OK: ${violations.length} ≤ baseline ${BASELINE}.`);
  process.exit(0);
}
console.log(
  ENFORCE
    ? "[audit-router-usage] ENFORCE mode: failing build."
    : "[audit-router-usage] Advisory mode (no failure). Re-run with --enforce to gate the build.",
);
process.exit(ENFORCE ? 1 : 0);
