#!/usr/bin/env node
/**
 * scripts/audit-supabase-migrations.mjs
 * Sprint 52 — A1: Supabase migration quality audit
 *
 * Checks every SQL file in supabase/migrations/ for common issues:
 *   1. CREATE TABLE without IF NOT EXISTS guard
 *   2. DROP TABLE / DROP COLUMN without IF EXISTS guard
 *   3. Tables created without RLS ever being enabled (cross-file scan)
 *   4. Foreign-key columns (REFERENCES) with no corresponding CREATE INDEX
 *   5. Migration filename numbering gaps (e.g. 003 → 005)
 *   6. Tables with created_at but no updated_at column (or vice versa)
 *
 * Exit codes:
 *   0 — all checks pass (or advisory-only with no --enforce flag)
 *   1 — one or more checks failed in --enforce mode
 *
 * Usage:
 *   node scripts/audit-supabase-migrations.mjs           # advisory
 *   node scripts/audit-supabase-migrations.mjs --enforce # fail on issues
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parseAuditArgs } from "./lib/audit-utils.mjs";

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");
const { enforce: ENFORCE } = parseAuditArgs();

// ── Helpers ───────────────────────────────────────────────────────────────

function _relPath(p) {
  return relative(ROOT, p).split(sep).join("/");
}

/** Strip SQL line comments and block comments (rough, sufficient for audit) */
function stripComments(sql) {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
}

// ── Load migrations ───────────────────────────────────────────────────────

let files;
try {
  files = readdirSync(MIGRATIONS_DIR)
    .filter((n) => /^\d{3}_.*\.sql$/.test(n))
    .sort();
} catch {
  console.error(`[audit-supabase-migrations] Cannot read ${MIGRATIONS_DIR}`);
  process.exit(ENFORCE ? 1 : 0);
}

if (files.length === 0) {
  console.log("[audit-supabase-migrations] No migration files found. Skipping.");
  process.exit(0);
}

const issues = [];

function issue(file, msg) {
  issues.push(`  ${file}: ${msg}`);
}

// Read all content up front for cross-file checks
const allContent = files.map((f) => {
  const raw = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
  return { file: f, raw, sql: stripComments(raw) };
});

const _combinedSql = allContent.map((m) => m.sql).join("\n");

// ── Check 1: Numbering gaps ───────────────────────────────────────────────

const numbers = files.map((f) => parseInt(f.slice(0, 3), 10));
for (let i = 1; i < numbers.length; i++) {
  if (numbers[i] !== numbers[i - 1] + 1) {
    issue(
      files[i],
      `numbering gap — expected ${String(numbers[i - 1] + 1).padStart(3, "0")} but got ${String(numbers[i]).padStart(3, "0")}`,
    );
  }
}

// ── Per-file checks ───────────────────────────────────────────────────────

// Track all table names seen in CREATE TABLE statements (across all files)
const createdTables = new Set();
const rlsEnabledTables = new Set();
const indexedColumns = new Set(); // "table.column"

// First pass: collect table names and RLS enables from combined SQL
for (const { sql } of allContent) {
  // Collect CREATE TABLE names (handle optional schema prefix e.g. public.table)
  for (const m of sql.matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\w+\.)?["']?(\w+)["']?/gi,
  )) {
    createdTables.add(m[1].toLowerCase());
  }
  // Collect RLS enables (handle optional schema prefix)
  for (const m of sql.matchAll(
    /ALTER\s+TABLE\s+(?:\w+\.)?["']?(\w+)["']?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi,
  )) {
    rlsEnabledTables.add(m[1].toLowerCase());
  }
  // Collect indexed columns (handle optional schema prefix)
  for (const m of sql.matchAll(
    /CREATE\s+INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?\w+\s+ON\s+(?:\w+\.)?["']?(\w+)["']?\s*\(([^)]+)\)/gi,
  )) {
    const table = m[1].toLowerCase();
    // extract first column name from index expression
    const firstCol = m[2].trim().split(/[\s,(]/)[0].replace(/['"]/g, "").toLowerCase();
    indexedColumns.add(`${table}.${firstCol}`);
  }
}

// Second pass: per-file detailed checks
for (const { file, sql } of allContent) {
  // Check 2: CREATE TABLE without IF NOT EXISTS (handle optional schema prefix)
  for (const m of sql.matchAll(
    /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)(?:\w+\.)?["']?(\w+)["']?/gi,
  )) {
    issue(file, `CREATE TABLE "${m[1]}" missing IF NOT EXISTS guard`);
  }

  // Check 3: DROP TABLE without IF EXISTS
  for (const m of sql.matchAll(/DROP\s+TABLE\s+(?!IF\s+EXISTS)["']?(\w+)["']?/gi)) {
    issue(file, `DROP TABLE "${m[1]}" missing IF EXISTS guard (destructive)`);
  }

  // Check 3b: DROP COLUMN without IF EXISTS (PostgreSQL 9.0+)
  for (const m of sql.matchAll(
    /ALTER\s+TABLE\s+\w+\s+DROP\s+COLUMN\s+(?!IF\s+EXISTS)["']?(\w+)["']?/gi,
  )) {
    issue(file, `DROP COLUMN "${m[1]}" missing IF EXISTS guard (destructive)`);
  }

  // Check 4: REFERENCES columns without a matching index
  // Pattern: column_name  TYPE  [NOT NULL] REFERENCES table_name
  for (const m of sql.matchAll(
    /(\w+)\s+\w+(?:\(\d+\))?\s+(?:NOT\s+NULL\s+)?REFERENCES\s+(\w+)/gi,
  )) {
    const fkCol = m[1].toLowerCase();
    // Determine the owning table from the surrounding CREATE TABLE block
    // (rough: look backwards in file for the most recent CREATE TABLE)
    const sqlBefore = sql.slice(0, m.index);
    const tableMatch = [...sqlBefore.matchAll(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?/gi,
    )].pop();
    if (!tableMatch) continue;
    const ownerTable = tableMatch[1].toLowerCase();
    if (!indexedColumns.has(`${ownerTable}.${fkCol}`)) {
      issue(
        file,
        `FK column "${ownerTable}.${fkCol}" REFERENCES ${m[2]} but has no index — consider CREATE INDEX`,
      );
    }
  }

  // Check 6: created_at without updated_at (and vice versa) in same CREATE TABLE
  for (const m of sql.matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\w+\.)?["']?(\w+)["']?\s*\(([^;]+?)\)/gis,
  )) {
    const body = m[2];
    const hasCreatedAt = /\bcreated_at\b/i.test(body);
    const hasUpdatedAt = /\bupdated_at\b/i.test(body);
    if (hasCreatedAt && !hasUpdatedAt) {
      issue(file, `Table "${m[1]}" has created_at but no updated_at`);
    }
    if (hasUpdatedAt && !hasCreatedAt) {
      issue(file, `Table "${m[1]}" has updated_at but no created_at`);
    }
  }
}

// ── Check 5 (cross-file): Tables without RLS ─────────────────────────────
// Exclude known system/internal tables that don't need RLS in this project
const RLS_EXEMPT = new Set(["schema_migrations", "spatial_ref_sys"]);
for (const tbl of createdTables) {
  if (!rlsEnabledTables.has(tbl) && !RLS_EXEMPT.has(tbl)) {
    issue("(cross-file)", `Table "${tbl}" has no ENABLE ROW LEVEL SECURITY in any migration`);
  }
}

// ── Report ────────────────────────────────────────────────────────────────

const tableCount = createdTables.size;
const rlsCount = rlsEnabledTables.size;
console.log(
  `[audit-supabase-migrations] ${files.length} migration(s) scanned` +
    ` | tables: ${tableCount} | RLS-enabled: ${rlsCount}` +
    ` | issues: ${issues.length}`,
);

if (issues.length > 0) {
  console.log("\nIssues found:");
  for (const line of issues) console.log(line);
  if (ENFORCE) {
    console.log(
      "\n[audit-supabase-migrations] ENFORCE: failing due to issues above.",
    );
    process.exit(1);
  }
  console.log(
    "\n[audit-supabase-migrations] Advisory mode — re-run with --enforce to gate CI.",
  );
} else {
  console.log("[audit-supabase-migrations] All checks passed ✓");
}

process.exit(0);
