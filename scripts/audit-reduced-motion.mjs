#!/usr/bin/env node
/**
 * scripts/audit-reduced-motion.mjs — S586 + S587
 *
 * Full CSS accessibility audit:
 *   1. prefers-reduced-motion: every animating file has a `reduce` guard.
 *   2. prefers-contrast: at least one `prefers-contrast: more` block exists
 *      in the codebase (token overrides for high-contrast users).
 *   3. forced-colors: at least one `forced-colors: active` block exists
 *      (Windows High Contrast Mode / Contrast Themes).
 *
 * Usage:
 *   node scripts/audit-reduced-motion.mjs
 *   node scripts/audit-reduced-motion.mjs --strict   # fail on any gap
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
let filesWithMotionGuards = 0;
let filesWithContrastGuards = 0;
let filesWithForcedColorsGuards = 0;

for (const file of walk(ROOT)) {
  const css = readFileSync(file, "utf8");
  const animMatches = css.match(/\b(animation|transition)\s*:/g) || [];
  const motionGuards = css.match(/prefers-reduced-motion:\s*reduce/g) || [];
  const contrastGuards = css.match(/prefers-contrast:\s*more/g) || [];
  const forcedColorsGuards = css.match(/forced-colors:\s*active/g) || [];

  totalAnimations += animMatches.length;
  if (motionGuards.length > 0) filesWithMotionGuards++;
  if (contrastGuards.length > 0) filesWithContrastGuards++;
  if (forcedColorsGuards.length > 0) filesWithForcedColorsGuards++;

  if (animMatches.length > 0 && motionGuards.length === 0) {
    violations.push({ file, type: "reduced-motion", animations: animMatches.length });
  }
}

// Report: reduced-motion
console.log(
  `[reduced-motion] scanned ${ROOT}/, found ${totalAnimations} animation/transition decls; ${filesWithMotionGuards} file(s) with reduce guards.`,
);

// Report: prefers-contrast
console.log(
  `[prefers-contrast] ${filesWithContrastGuards} file(s) with high-contrast overrides.`,
);
if (filesWithContrastGuards === 0) {
  violations.push({ file: ROOT, type: "prefers-contrast", missing: "No prefers-contrast: more block found" });
}

// Report: forced-colors
console.log(
  `[forced-colors] ${filesWithForcedColorsGuards} file(s) with forced-colors: active overrides.`,
);
if (filesWithForcedColorsGuards === 0) {
  violations.push({ file: ROOT, type: "forced-colors", missing: "No forced-colors: active block found" });
}

// Summary
if (violations.length > 0) {
  console.error(`\n[a11y-css] ${violations.length} issue(s) found:`);
  for (const v of violations) {
    if (v.type === "reduced-motion") {
      console.error(`  - ${v.file}: ${v.animations} animation decl(s) without reduce guard`);
    } else {
      console.error(`  - ${v.type}: ${v.missing}`);
    }
  }
  if (STRICT) process.exit(1);
} else {
  console.log("\n[a11y-css] OK — reduced-motion, prefers-contrast, and forced-colors all covered.");
}
