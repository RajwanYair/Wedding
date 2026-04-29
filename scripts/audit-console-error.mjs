#!/usr/bin/env node
/**
 * audit-console-error.mjs — Advisory scan for `console.error(` call sites
 * outside the permanent allowlist (ADR-032).
 *
 * Exit codes:
 *   0  → advisory mode (always); summary printed.
 *   1  → only when `--enforce` is passed AND violations > BASELINE.
 */

import { readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { walk } from "./lib/file-walker.mjs";
import { parseAuditArgs } from "./lib/audit-utils.mjs";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

// Permanent allowlist — see ADR-032.
const ALLOWLIST = new Set([
  "src/services/error-monitor.js",
  "src/services/health.js",
]);

// Baseline — all 9 sites migrated to reportError() in S298 (v13.12.0).
const BASELINE = 0;

const { enforce: ENFORCE } = parseAuditArgs();

const violations = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).split(sep).join("/");
  if (ALLOWLIST.has(rel)) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (/\bconsole\.error\s*\(/.test(line)) {
      violations.push({ file: rel, line: i + 1, text: line.trim() });
    }
  });
}

if (violations.length === 0) {
  console.log("[audit-console-error] 0 call sites outside allowlist. ✅");
  process.exit(0);
}

console.log(
  `[audit-console-error] Found ${violations.length} call site(s) to migrate (ADR-032):\n`,
);
for (const v of violations.slice(0, 50)) {
  console.log(`  ${v.file}:${v.line}`);
  console.log(`    > ${v.text}`);
  console.log(`    fix: import { reportError } from "../services/error-monitor.js"; reportError(err, { source, op });`);
}
if (violations.length > 50) {
  console.log(`  …and ${violations.length - 50} more.`);
}

if (ENFORCE && violations.length > BASELINE) {
  console.log(
    `\n[audit-console-error] ENFORCE: ${violations.length} > baseline ${BASELINE}. Failing.`,
  );
  process.exit(1);
}
if (ENFORCE) {
  console.log(
    `\n[audit-console-error] OK: ${violations.length} ≤ baseline ${BASELINE}.`,
  );
} else {
  console.log(
    "\n[audit-console-error] Advisory mode (no failure). Re-run with --enforce to gate.",
  );
}
process.exit(0);
