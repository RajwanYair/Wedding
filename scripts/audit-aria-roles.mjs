#!/usr/bin/env node
/**
 * scripts/audit-aria-roles.mjs — Advisory scan for ARIA role hygiene
 * (ADR-029 phase A1 prep).
 *
 * Reports:
 *   1. Buttons / clickable elements without `aria-label` *and* without text content.
 *   2. Modals (`role="dialog"`) missing `aria-modal="true"` or `aria-labelledby`.
 *   3. Live-region elements missing `aria-live` polite/assertive.
 *
 * Advisory mode (default): always exits 0.
 * Pass `--enforce` to exit 1 on any violation.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOTS = ["src/templates", "src/modals", "index.html"];
const ENFORCE = process.argv.includes("--enforce");

/** @type {{ file: string, line: number, rule: string, snippet: string }[]} */
const violations = [];

/**
 * @param {string} dirOrFile
 * @returns {Generator<string>}
 */
function* walk(dirOrFile) {
  let st;
  try {
    st = statSync(dirOrFile);
  } catch {
    return;
  }
  if (st.isFile()) {
    if (extname(dirOrFile) === ".html") yield dirOrFile;
    return;
  }
  for (const name of readdirSync(dirOrFile)) {
    yield* walk(join(dirOrFile, name));
  }
}

const RULES = [
  {
    id: "dialog-missing-aria-modal",
    test(line) {
      return /role=["']dialog["']/.test(line) && !/aria-modal=["']true["']/.test(line);
    },
  },
  {
    id: "dialog-missing-labelledby",
    test(line) {
      return (
        /role=["']dialog["']/.test(line) &&
        !/aria-labelledby=/.test(line) &&
        !/aria-label=/.test(line)
      );
    },
  },
  {
    id: "live-region-missing-aria-live",
    test(line) {
      return /role=["']status["']/.test(line) && !/aria-live=/.test(line);
    },
  },
  {
    id: "icon-button-missing-aria-label",
    test(line) {
      // <button …> with no text node *between* the open/close tags
      // and no aria-label attribute. Single-line heuristic only.
      const m = line.match(/<button\b[^>]*>([^<]*)<\/button>/);
      if (!m) return false;
      if (/aria-label=/.test(line)) return false;
      // If inner text has a non-whitespace non-tag char, assume labelled.
      return m[1].trim().length === 0;
    },
  },
];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = relative(".", file).replace(/\\/g, "/");
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, idx) => {
      for (const rule of RULES) {
        if (rule.test(line)) {
          violations.push({
            file: rel,
            line: idx + 1,
            rule: rule.id,
            snippet: line.trim().slice(0, 120),
          });
        }
      }
    });
  }
}

if (violations.length === 0) {
  console.log("[audit-aria-roles] OK — no ARIA hygiene issues detected.");
  process.exit(0);
}

console.log(`[audit-aria-roles] Found ${violations.length} potential issue(s):`);
console.log();
for (const v of violations) {
  console.log(`  ${v.file}:${v.line}  [${v.rule}]`);
  console.log(`    > ${v.snippet}`);
}
console.log();
const BASELINE_ARG = process.argv.find((a) => a.startsWith("--baseline="));
const BASELINE = BASELINE_ARG ? Number(BASELINE_ARG.split("=")[1]) : null;
if (BASELINE !== null && Number.isFinite(BASELINE)) {
  if (violations.length > BASELINE) {
    console.log(`[audit-aria-roles] BASELINE ${BASELINE}: ${violations.length} issue(s) (regression). Failing.`);
    process.exit(1);
  }
  console.log(`[audit-aria-roles] OK: ${violations.length} ≤ baseline ${BASELINE}.`);
  process.exit(0);
}
console.log(
  ENFORCE
    ? "[audit-aria-roles] ENFORCE mode: failing build."
    : "[audit-aria-roles] Advisory mode (no failure). Re-run with --enforce to gate the build.",
);
process.exit(ENFORCE ? 1 : 0);
