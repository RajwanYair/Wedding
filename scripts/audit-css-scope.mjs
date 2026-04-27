#!/usr/bin/env node
/**
 * audit-css-scope.mjs — Advisory inventory of CSS rules that target a
 * `[data-section="…"]` selector outside an `@scope` block (ADR-036).
 *
 * Heuristic: line-by-line walk of css/*.css. We track the current
 * brace-depth and whether we are inside `@scope (...)`. Any selector
 * containing `[data-section=` while NOT inside `@scope` is flagged.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parseAuditArgs } from "./lib/audit-utils.mjs";

const ROOT = process.cwd();
const CSS_DIR = join(ROOT, "css");

const { enforce: ENFORCE } = parseAuditArgs();
const BASELINE = 4;

const files = readdirSync(CSS_DIR).filter((n) => n.endsWith(".css"));

const violations = [];
for (const name of files) {
  const p = join(CSS_DIR, name);
  const rel = relative(ROOT, p).split(sep).join("/");
  const src = readFileSync(p, "utf8");

  let depth = 0;
  const scopeDepths = [];
  let lineNo = 0;
  for (const line of src.split(/\r?\n/)) {
    lineNo++;
    const stripped = line.replace(/\/\*.*?\*\//g, "");
    if (/@scope\s*\(/.test(stripped)) scopeDepths.push(depth + 1);
    const opens = (stripped.match(/\{/g) || []).length;
    const closes = (stripped.match(/\}/g) || []).length;
    const inScope = scopeDepths.length > 0 && depth >= scopeDepths[scopeDepths.length - 1];

    if (/\[data-section\s*=/.test(stripped) && /\{/.test(stripped) && !inScope) {
      violations.push({ file: rel, line: lineNo, text: stripped.trim() });
    }
    depth += opens - closes;
    while (scopeDepths.length && depth < scopeDepths[scopeDepths.length - 1]) {
      scopeDepths.pop();
    }
  }
}

console.log(
  `[audit-css-scope] ${violations.length} unscoped [data-section="…"] selector(s).`,
);
if (violations.length) {
  for (const v of violations.slice(0, 30)) {
    console.log(`  ${v.file}:${v.line}  ${v.text}`);
  }
  if (violations.length > 30) {
    console.log(`  …and ${violations.length - 30} more.`);
  }
  console.log("\n  fix: wrap in `@scope ([data-section=\"<name>\"]) { … }` per ADR-036.");
}

if (ENFORCE && violations.length > BASELINE) {
  console.log(
    `\n[audit-css-scope] ENFORCE: ${violations.length} > baseline ${BASELINE}. Failing.`,
  );
  process.exit(1);
}
console.log(
  "\n[audit-css-scope] Advisory mode (no failure). Re-run with --enforce to gate.",
);
process.exit(0);
