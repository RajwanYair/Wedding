#!/usr/bin/env node
/**
 * scripts/typecheck.mjs
 *
 * Baseline-aware typecheck wrapper around `tsc --noEmit`.
 *
 *   - Runs `tsc --noEmit` against `tsconfig.json`.
 *   - Reads the committed baseline from `typecheck-baseline.txt` (a sorted
 *     list of error fingerprints `<file>:<code>:<message>` — line/column are
 *     intentionally excluded so unrelated edits do not invalidate entries).
 *   - Exit codes:
 *       0 → no new errors (regressions). Already-known errors are tolerated.
 *       1 → at least one NEW error not present in the baseline.
 *       2 → baseline contains entries that no longer reproduce. Run with
 *           `--update` to refresh the baseline; CI should fail until done.
 *
 * Refresh flow:
 *   $ npm run typecheck -- --update     # rewrites typecheck-baseline.txt
 *   $ git add typecheck-baseline.txt    # commit the shrinkage
 *
 * Goal: prevent strict-TS regressions while the codebase is incrementally
 * cleaned up. Baseline shrinks over time; never grows silently.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const baselinePath = resolve(projectRoot, "typecheck-baseline.txt");

const UPDATE = process.argv.includes("--update");

// ── Run tsc ───────────────────────────────────────────────────────────────
const tscExt = process.platform === "win32" ? "tsc.cmd" : "tsc";
const tscBin =
  [
    resolve(projectRoot, "node_modules", ".bin", tscExt),
    resolve(projectRoot, "..", "node_modules", ".bin", tscExt),
  ].find((p) => existsSync(p)) ??
  resolve(projectRoot, "node_modules", ".bin", tscExt);
let raw = "";
try {
  const result = spawnSync(`"${tscBin}" --noEmit --pretty false`, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  raw = `${result.stdout ?? ""}${result.stderr ?? ""}`;
} catch (err) {
  console.error("Failed to invoke tsc:", err);
  process.exit(3);
}

// ── Parse error lines ─────────────────────────────────────────────────────
// Format: `path/to/file.js(LINE,COL): error TS####: message...`
const ERROR_RE = /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)$/;

/** @type {Set<string>} */
const current = new Set();
for (const line of raw.split(/\r?\n/)) {
  const m = ERROR_RE.exec(line);
  if (!m) continue;
  const [, file, , , code, message] = m;
  // Fingerprint: file + code + first 120 chars of message (line/col excluded)
  const fingerprint = `${file.replace(/\\/g, "/")}::${code}::${message.slice(0, 120)}`;
  current.add(fingerprint);
}

// ── Update mode ───────────────────────────────────────────────────────────
if (UPDATE) {
  const sorted = [...current].sort();
  writeFileSync(baselinePath, sorted.join("\n") + (sorted.length ? "\n" : ""));
  console.log(`Baseline updated: ${sorted.length} known errors written to ${baselinePath}`);
  process.exit(0);
}

// ── Load baseline ─────────────────────────────────────────────────────────
/** @type {Set<string>} */
const baseline = new Set();
if (existsSync(baselinePath)) {
  for (const l of readFileSync(baselinePath, "utf8").split(/\r?\n/)) {
    if (l.trim()) baseline.add(l);
  }
}

// ── Diff ──────────────────────────────────────────────────────────────────
const newErrors = [...current].filter((fp) => !baseline.has(fp)).sort();
const fixed = [...baseline].filter((fp) => !current.has(fp)).sort();

console.log(`\n=== Typecheck (tsc --noEmit) ===`);
console.log(`Baseline: ${baseline.size}`);
console.log(`Current:  ${current.size}`);
console.log(`New:      ${newErrors.length}`);
console.log(`Fixed:    ${fixed.length}`);

if (newErrors.length) {
  console.log(`\nNEW errors (regressions):`);
  for (const e of newErrors) console.log(`  ${e}`);
}

if (newErrors.length > 0) {
  console.error(`\n✖ Typecheck FAIL — ${newErrors.length} new error(s) not in baseline.`);
  process.exit(1);
}

if (fixed.length > 0) {
  console.log(`\n✔ ${fixed.length} known error(s) no longer reproduce.`);
  console.log(`  Run \`npm run typecheck -- --update\` to refresh the baseline.`);
  process.exit(2);
}

console.log(`\n✔ Typecheck OK — no new errors against baseline.`);
process.exit(0);
