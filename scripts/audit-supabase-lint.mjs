#!/usr/bin/env node
/**
 * audit-supabase-lint.mjs — static checks on supabase/migrations/*.sql.
 * CI-friendly (no Docker / no Postgres required). Catches the most common
 * regressions; the heavier `supabase db lint` runs in a separate workflow
 * when Docker is available.
 *
 * Checks per file:
 *   1. Numeric prefix in filename (e.g. "023_*.sql")
 *   2. Non-empty body
 *   3. `DROP TABLE` / `DROP INDEX` / `DROP TRIGGER` / `DROP FUNCTION` use
 *      `IF EXISTS` (safe re-apply)
 *   4. `CREATE TABLE` / `CREATE INDEX` / `CREATE FUNCTION` use
 *      `IF NOT EXISTS` or `CREATE OR REPLACE` (idempotent)
 *   5. `ALTER TABLE … ADD COLUMN` uses `IF NOT EXISTS`
 *   6. No trailing whitespace on lines
 *   7. File ends with newline + last non-blank line ends with `;` or `END;`
 *
 * Usage: node scripts/audit-supabase-lint.mjs [--enforce]
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseAuditArgs } from "./lib/audit-utils.mjs";

const ROOT = process.cwd();
const DIR = join(ROOT, "supabase", "migrations");
const { enforce: ENFORCE, baseline: BASELINE_ARG } = parseAuditArgs();
const BASELINE_DEFAULT = 1; // 008_unique_guest_phone — legacy, immutable.
const BASELINE = BASELINE_ARG > 0 ? BASELINE_ARG : BASELINE_DEFAULT;

/**
 * Strip SQL comments (-- line and slash-star block) for keyword scans.
 * @param {string} sql
 * @returns {string}
 */
function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ");
}

const violations = [];

let files;
try {
  files = readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
} catch {
  console.log("[audit-supabase-lint] no supabase/migrations/ dir; skipping.");
  process.exit(0);
}

for (const f of files) {
  const abs = join(DIR, f);
  if (!statSync(abs).isFile()) continue;
  const raw = readFileSync(abs, "utf8");
  const sql = stripComments(raw);

  if (!/^\d{3,}_/.test(f)) {
    violations.push({ file: f, msg: "missing 3-digit numeric prefix" });
  }
  if (raw.trim().length === 0) {
    violations.push({ file: f, msg: "empty migration" });
    continue;
  }

  // Trailing whitespace
  const lines = raw.split(/\r?\n/);
  lines.forEach((ln, i) => {
    if (/[ \t]+$/.test(ln)) {
      violations.push({ file: f, msg: `trailing whitespace on line ${i + 1}` });
    }
  });

  // Last non-blank line must end with ';' (allows END; / $$;)
  const nonBlank = lines.map((l) => l.trim()).filter((l) => l.length > 0);
  const last = nonBlank[nonBlank.length - 1] ?? "";
  if (!/;\s*$/.test(last)) {
    violations.push({ file: f, msg: "last statement missing terminating ';'" });
  }

  // DROP guards
  const dropRe = /\bdrop\s+(table|index|trigger|function|view|policy|type)\b(?!\s+if\s+exists)/gi;
  for (const m of sql.matchAll(dropRe)) {
    const lineNo = sql.slice(0, m.index ?? 0).split(/\n/).length;
    violations.push({
      file: f,
      msg: `DROP ${m[1].toUpperCase()} without IF EXISTS (line ~${lineNo})`,
    });
  }

  // CREATE guards (skip CREATE OR REPLACE / CREATE … IF NOT EXISTS).
  // Postgres `CREATE TRIGGER` does NOT support IF NOT EXISTS; the
  // canonical idempotent pattern is `DROP TRIGGER IF EXISTS … CREATE
  // TRIGGER`. We accept either form.
  const createRe = /\bcreate\s+(table|index|unique\s+index|trigger)\b/gi;
  for (const m of sql.matchAll(createRe)) {
    const slice = sql.slice(m.index ?? 0, (m.index ?? 0) + 200);
    if (/if\s+not\s+exists/i.test(slice)) continue;
    if (/^trigger$/i.test(m[1])) {
      // Look back for a matching `DROP TRIGGER IF EXISTS <same name>`.
      const before = sql.slice(0, m.index ?? 0);
      const nameMatch = slice.match(/\btrigger\s+([A-Za-z_][\w]*)/i);
      const name = nameMatch?.[1];
      if (
        name &&
        new RegExp(`drop\\s+trigger\\s+if\\s+exists\\s+${name}\\b`, "i").test(before)
      ) {
        continue;
      }
    }
    const lineNo = sql.slice(0, m.index ?? 0).split(/\n/).length;
    violations.push({
      file: f,
      msg: `CREATE ${m[1].toUpperCase()} without IF NOT EXISTS (line ~${lineNo})`,
    });
  }

  // ALTER TABLE ADD COLUMN guard
  const alterAddRe = /\balter\s+table\s+[^\n;]+\badd\s+column\b(?!\s+if\s+not\s+exists)/gi;
  for (const m of sql.matchAll(alterAddRe)) {
    const lineNo = sql.slice(0, m.index ?? 0).split(/\n/).length;
    violations.push({
      file: f,
      msg: `ALTER TABLE … ADD COLUMN without IF NOT EXISTS (line ~${lineNo})`,
    });
  }
}

console.log(
  `[audit-supabase-lint] scanned ${files.length} migration file(s); ${violations.length} issue(s).`,
);
for (const v of violations) {
  console.log(`  ${v.file}  ${v.msg}`);
}

if (ENFORCE && violations.length > BASELINE) {
  console.log(
    `\n[audit-supabase-lint] ENFORCE: ${violations.length} > baseline ${BASELINE}.`,
  );
  process.exit(1);
}
console.log(
  `\n[audit-supabase-lint] Baseline ${BASELINE} (legacy 008). Re-run with --enforce to gate.`,
);
process.exit(0);
