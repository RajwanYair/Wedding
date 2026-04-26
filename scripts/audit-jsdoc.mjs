#!/usr/bin/env node
/**
 * audit-jsdoc.mjs — Advisory scan of exported functions in src/core/ and
 * src/services/ that lack a JSDoc block. Counts only top-level exports
 * (`export function`, `export async function`, `export const … = (…)`
 * arrow forms with explicit names).
 *
 * This is a *coverage* metric, not a strict linter. Use the ESLint
 * `eslint-plugin-jsdoc` plugin for syntax-level enforcement.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["src/core", "src/services"];

const ENFORCE = process.argv.includes("--enforce");
const BASELINE = 999;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (name.endsWith(".js") && !name.endsWith(".test.js")) out.push(p);
  }
  return out;
}

const exportFuncRe =
  /^(\s*)export\s+(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)/gm;

let total = 0;
let missing = 0;
const violations = [];

for (const d of TARGET_DIRS) {
  const abs = join(ROOT, d);
  for (const file of walk(abs)) {
    const rel = relative(ROOT, file).split(sep).join("/");
    const src = readFileSync(file, "utf8");
    const lines = src.split(/\r?\n/);
    for (const m of src.matchAll(exportFuncRe)) {
      total++;
      const name = m[2] || m[3];
      const idx = m.index ?? 0;
      const lineNo = src.slice(0, idx).split(/\r?\n/).length;
      // Check the 6 lines preceding for `*/` (close of JSDoc block)
      const preceding = lines.slice(Math.max(0, lineNo - 7), lineNo - 1).join("\n");
      if (!/\*\/\s*$/.test(preceding)) {
        missing++;
        violations.push({ file: rel, line: lineNo, name });
      }
    }
  }
}

const pct = total === 0 ? 100 : Math.round(((total - missing) / total) * 100);
console.log(
  `[audit-jsdoc] ${total - missing}/${total} exports documented (${pct}%); ${missing} missing.`,
);

if (missing > 0) {
  console.log("\nMissing JSDoc on:");
  for (const v of violations.slice(0, 40)) {
    console.log(`  ${v.file}:${v.line}  ${v.name}()`);
  }
  if (violations.length > 40) {
    console.log(`  …and ${violations.length - 40} more.`);
  }
}

if (ENFORCE && missing > BASELINE) {
  console.log(
    `\n[audit-jsdoc] ENFORCE: ${missing} > baseline ${BASELINE}. Failing.`,
  );
  process.exit(1);
}
console.log(
  "\n[audit-jsdoc] Advisory mode (no failure). Re-run with --enforce to gate.",
);
process.exit(0);
