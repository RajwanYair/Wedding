#!/usr/bin/env node
/**
 * scripts/audit-reduced-motion.mjs — S586
 *
 * Verifies that every CSS animation/transition rule in css/ either:
 *   1. Lives inside a `prefers-reduced-motion: no-preference` block, OR
 *   2. Is overridden by a `prefers-reduced-motion: reduce` block in the
 *      same file that nullifies animations/transitions.
 *
 * This is a lightweight heuristic, not a full CSS parser — flags the
 * count of unguarded animation declarations and asserts at least one
 * `reduce` guard exists per file that animates.
 *
 * Usage:
 *   node scripts/audit-reduced-motion.mjs
 *   node scripts/audit-reduced-motion.mjs --strict   # fail on any unguarded
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const STRICT = process.argv.includes("--strict");
const ROOT = "css";

/** @param {string} dir */
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (p.endsWith(".css")) yield p;
  }
}

const violations = [];
let totalAnimations = 0;
let filesWithGuards = 0;

for (const file of walk(ROOT)) {
  const css = readFileSync(file, "utf8");
  const animMatches = css.match(/\b(animation|transition)\s*:/g) || [];
  const reduceGuards = css.match(/prefers-reduced-motion:\s*reduce/g) || [];
  totalAnimations += animMatches.length;
  if (reduceGuards.length > 0) filesWithGuards++;

  if (animMatches.length > 0 && reduceGuards.length === 0) {
    violations.push({ file, animations: animMatches.length });
  }
}

console.log(
  `[reduced-motion] scanned ${ROOT}/, found ${totalAnimations} animation/transition decls; ${filesWithGuards} file(s) with reduce guards.`,
);

if (violations.length > 0) {
  console.error(`[reduced-motion] ${violations.length} file(s) animate without a reduce guard:`);
  for (const v of violations) console.error(`  - ${v.file} (${v.animations} decls)`);
  if (STRICT) process.exit(1);
} else {
  console.log("[reduced-motion] OK — every animating CSS file has a reduce guard.");
}
