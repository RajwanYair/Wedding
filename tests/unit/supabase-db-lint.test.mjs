/**
 * tests/unit/supabase-db-lint.test.mjs — S167
 *
 * Unit tests for the static SQL migration linter logic in
 * scripts/audit-supabase-lint.mjs. The pure check functions are
 * reproduced here (the script itself uses process.exit which
 * complicates direct import in tests).
 */

import { describe, it, expect } from "vitest";

// ── Pure helpers reproduced from audit-supabase-lint.mjs ─────────────────

/**
 * Strip SQL comments (-- line and slash-star block).
 * @param {string} sql
 * @returns {string}
 */
function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ");
}

/**
 * Run all static checks on a single SQL body.
 * Returns an array of violation message strings.
 * @param {string} filename
 * @param {string} raw
 * @returns {string[]}
 */
function checkMigration(filename, raw) {
  const violations = [];
  const sql = stripComments(raw);

  // Numeric prefix check
  if (!/^\d{3,}_/.test(filename)) {
    violations.push("missing 3-digit numeric prefix");
  }

  // Empty body
  if (raw.trim().length === 0) {
    violations.push("empty migration");
    return violations;
  }

  // Trailing whitespace
  const lines = raw.split(/\r?\n/);
  lines.forEach((ln, i) => {
    if (/[ \t]+$/.test(ln)) {
      violations.push(`trailing whitespace on line ${i + 1}`);
    }
  });

  // Last non-blank line ends with ';'
  const nonBlank = lines.map((l) => l.trim()).filter((l) => l.length > 0);
  const last = nonBlank[nonBlank.length - 1] ?? "";
  if (!/;\s*$/.test(last)) {
    violations.push("last statement missing terminating ';'");
  }

  // DROP guards
  const dropRe = /\bdrop\s+(table|index|trigger|function|view|policy|type)\b(?!\s+if\s+exists)/gi;
  for (const m of sql.matchAll(dropRe)) {
    const lineNo = sql.slice(0, m.index ?? 0).split(/\n/).length;
    violations.push(`DROP ${m[1].toUpperCase()} without IF EXISTS (line ~${lineNo})`);
  }

  // CREATE guards
  const createRe = /\bcreate\s+(table|index|unique\s+index|trigger)\b/gi;
  for (const m of sql.matchAll(createRe)) {
    const slice = sql.slice(m.index ?? 0, (m.index ?? 0) + 200);
    if (/if\s+not\s+exists/i.test(slice)) continue;
    if (/^trigger$/i.test(m[1])) {
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
    violations.push(`CREATE ${m[1].toUpperCase()} without IF NOT EXISTS (line ~${lineNo})`);
  }

  // ALTER TABLE ADD COLUMN guard
  const alterAddRe = /\balter\s+table\s+[^\n;]+\badd\s+column\b(?!\s+if\s+not\s+exists)/gi;
  for (const m of sql.matchAll(alterAddRe)) {
    const lineNo = sql.slice(0, m.index ?? 0).split(/\n/).length;
    violations.push(`ALTER TABLE … ADD COLUMN without IF NOT EXISTS (line ~${lineNo})`);
  }

  return violations;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("checkMigration — filename prefix", () => {
  it("passes file with 3-digit prefix", () => {
    const v = checkMigration("023_admin_users.sql", "CREATE TABLE IF NOT EXISTS foo (id TEXT);\n");
    expect(v.filter((x) => x.includes("prefix"))).toHaveLength(0);
  });

  it("flags file missing 3-digit prefix", () => {
    const v = checkMigration("admin_users.sql", "SELECT 1;\n");
    expect(v.some((x) => x.includes("prefix"))).toBe(true);
  });

  it("passes file with 4-digit prefix", () => {
    const v = checkMigration("0023_foo.sql", "SELECT 1;\n");
    expect(v.filter((x) => x.includes("prefix"))).toHaveLength(0);
  });
});

describe("checkMigration — empty body", () => {
  it("flags empty migration", () => {
    const v = checkMigration("001_empty.sql", "   ");
    expect(v).toContain("empty migration");
  });

  it("passes non-empty body", () => {
    const v = checkMigration("001_ok.sql", "SELECT 1;\n");
    expect(v).not.toContain("empty migration");
  });
});

describe("checkMigration — trailing whitespace", () => {
  it("flags trailing spaces", () => {
    const v = checkMigration("001_ok.sql", "SELECT 1;  \n");
    expect(v.some((x) => x.includes("trailing whitespace"))).toBe(true);
  });

  it("passes clean lines", () => {
    const v = checkMigration("001_ok.sql", "SELECT 1;\n");
    expect(v.filter((x) => x.includes("trailing whitespace"))).toHaveLength(0);
  });
});

describe("checkMigration — DROP guards", () => {
  it("flags DROP TABLE without IF EXISTS", () => {
    const v = checkMigration("001_ok.sql", "DROP TABLE foo;\n");
    expect(v.some((x) => x.includes("DROP TABLE without IF EXISTS"))).toBe(true);
  });

  it("passes DROP TABLE IF EXISTS", () => {
    const v = checkMigration("001_ok.sql", "DROP TABLE IF EXISTS foo;\n");
    expect(v.filter((x) => x.includes("DROP TABLE without IF EXISTS"))).toHaveLength(0);
  });

  it("passes DROP TRIGGER IF EXISTS", () => {
    const v = checkMigration("001_ok.sql",
      "DROP TRIGGER IF EXISTS my_trigger ON foo;\nCREATE TRIGGER my_trigger BEFORE INSERT ON foo FOR EACH ROW EXECUTE FUNCTION f();\n",
    );
    expect(v.filter((x) => x.includes("DROP TRIGGER without IF EXISTS"))).toHaveLength(0);
  });
});

describe("checkMigration — CREATE guards", () => {
  it("flags CREATE TABLE without IF NOT EXISTS", () => {
    const v = checkMigration("001_ok.sql", "CREATE TABLE foo (id text);\n");
    expect(v.some((x) => x.includes("CREATE TABLE without IF NOT EXISTS"))).toBe(true);
  });

  it("passes CREATE TABLE IF NOT EXISTS", () => {
    const v = checkMigration("001_ok.sql", "CREATE TABLE IF NOT EXISTS foo (id text);\n");
    expect(v.filter((x) => x.includes("CREATE TABLE without IF NOT EXISTS"))).toHaveLength(0);
  });

  it("passes CREATE INDEX IF NOT EXISTS", () => {
    const v = checkMigration("001_ok.sql",
      "CREATE INDEX IF NOT EXISTS foo_idx ON foo (id);\n",
    );
    expect(v.filter((x) => x.includes("CREATE INDEX without IF NOT EXISTS"))).toHaveLength(0);
  });

  it("flags CREATE UNIQUE INDEX without IF NOT EXISTS", () => {
    const v = checkMigration("001_ok.sql", "CREATE UNIQUE INDEX foo_idx ON foo (id);\n");
    expect(v.some((x) => x.includes("CREATE UNIQUE") || x.includes("without IF NOT EXISTS"))).toBe(true);
  });
});

describe("checkMigration — ALTER TABLE ADD COLUMN", () => {
  it("flags ADD COLUMN without IF NOT EXISTS", () => {
    const v = checkMigration("001_ok.sql",
      "ALTER TABLE foo ADD COLUMN bar TEXT;\n",
    );
    expect(v.some((x) => x.includes("ADD COLUMN without IF NOT EXISTS"))).toBe(true);
  });

  it("passes ADD COLUMN IF NOT EXISTS", () => {
    const v = checkMigration("001_ok.sql",
      "ALTER TABLE foo ADD COLUMN IF NOT EXISTS bar TEXT;\n",
    );
    expect(v.filter((x) => x.includes("ADD COLUMN"))).toHaveLength(0);
  });
});

describe("checkMigration — last statement semicolon", () => {
  it("flags missing terminal semicolon", () => {
    const v = checkMigration("001_ok.sql", "SELECT 1\n");
    expect(v.some((x) => x.includes("terminating ';'"))).toBe(true);
  });

  it("passes when last non-blank line ends with semicolon", () => {
    const v = checkMigration("001_ok.sql", "SELECT 1;\n\n");
    expect(v.filter((x) => x.includes("terminating ';'"))).toHaveLength(0);
  });
});

describe("stripComments", () => {
  it("removes -- line comments", () => {
    expect(stripComments("SELECT 1; -- inline comment\n")).not.toContain("inline comment");
  });

  it("removes block comments", () => {
    expect(stripComments("/* block */ SELECT 1;")).not.toContain("block");
  });

  it("preserves code after comments", () => {
    const result = stripComments("-- remove this\nSELECT 1;");
    expect(result).toContain("SELECT 1;");
  });
});
