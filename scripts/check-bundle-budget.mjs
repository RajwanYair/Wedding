#!/usr/bin/env node
/**
 * scripts/check-bundle-budget.mjs — CI bundle budget enforcer (Sprint 66)
 *
 * Checks each built asset in `dist/` against a per-type size budget.
 * Exits 1 if any asset exceeds its budget.
 *
 * Usage:
 *   node scripts/check-bundle-budget.mjs
 *   node scripts/check-bundle-budget.mjs --dir dist --js-kb 300 --css-kb 60
 *
 * Flags:
 *   --dir  <path>   Build output directory (default: dist)
 *   --js-kb  <n>    JS budget per file in KB   (default: 300)
 *   --css-kb <n>    CSS budget per file in KB  (default: 60)
 *   --json          Output machine-readable JSON
 */

import { statSync, readdirSync } from "node:fs";
import { resolve, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");

// ── CLI flags ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function _flag(name, def) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return def;
  return args[idx + 1];
}

const DIST_DIR   = resolve(ROOT, _flag("--dir", "dist"));
const JS_BUDGET  = Number(_flag("--js-kb",  "300")) * 1024;
const CSS_BUDGET = Number(_flag("--css-kb", "60"))  * 1024;
const JSON_MODE  = args.includes("--json");

/**
 * @typedef {{ file: string, sizeBytes: number, budget: number, passed: boolean }} BudgetResult
 */

/**
 * Scan a directory (non-recursive) for .js and .css files and check budgets.
 * @param {string} dir
 * @param {number} jsBudget
 * @param {number} cssBudget
 * @returns {BudgetResult[]}
 */
export function checkBudget(dir, jsBudget, cssBudget) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  /** @type {BudgetResult[]} */
  const results = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (ext !== ".js" && ext !== ".css") continue;

    const budget = ext === ".js" ? jsBudget : cssBudget;
    let size;
    try {
      size = statSync(resolve(dir, entry.name)).size;
    } catch {
      continue;
    }
    results.push({
      file: entry.name,
      sizeBytes: size,
      budget,
      passed: size <= budget,
    });
  }

  return results.sort((a, b) => (b.sizeBytes - a.sizeBytes));
}

/**
 * Format bytes to human-readable KB.
 * @param {number} bytes
 * @returns {string}
 */
export function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Generate a plain-text budget report.
 * @param {BudgetResult[]} results
 * @returns {string}
 */
export function formatReport(results) {
  if (results.length === 0) return "No JS/CSS assets found.\n";
  const lines = ["Bundle Budget Report", "─".repeat(60)];
  for (const r of results) {
    const status = r.passed ? "✓" : "✗ OVER BUDGET";
    lines.push(
      `${status.padEnd(14)} ${r.file.padEnd(35)} ${formatKB(r.sizeBytes).padStart(10)}  / ${formatKB(r.budget)}`
    );
  }
  const failures = results.filter((r) => !r.passed).length;
  lines.push("─".repeat(60));
  lines.push(`Total: ${results.length} files | ${failures} over budget`);
  return lines.join("\n") + "\n";
}

// ── Entry point ───────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = checkBudget(DIST_DIR, JS_BUDGET, CSS_BUDGET);

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(results, null, 2) + "\n");
  } else {
    process.stdout.write(formatReport(results));
  }

  const failures = results.filter((r) => !r.passed);
  if (failures.length > 0) {
    process.stderr.write(`\n${failures.length} assets exceed their budget.\n`);
    process.exit(1);
  }
}
