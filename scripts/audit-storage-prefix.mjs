#!/usr/bin/env node
/**
 * scripts/audit-storage-prefix.mjs — Advisory check for raw localStorage
 * access using the `wedding_v1_` prefix outside `src/core/storage.js`.
 *
 * ROADMAP §3.2 / Phase B: every persistent read/write must go through the
 * storage layer (currently `src/core/storage.js`, target IDB in v13). This
 * audit makes accidental `localStorage.setItem("wedding_v1_…")` regressions
 * visible.
 *
 * Allowed call sites (whitelisted):
 *   - src/core/storage.js
 *
 * Advisory mode (default): always exits 0.
 * Pass `--enforce` to exit 1 when violations exceed `--baseline=N` (default 0).
 *
 * Usage:
 *   node scripts/audit-storage-prefix.mjs
 *   node scripts/audit-storage-prefix.mjs --enforce --baseline=0
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, sep } from "node:path";
import { globSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const ALLOW = new Set([
  // canonical storage layer — owns the prefix.
  "src/core/storage.js",
]);

const PATTERN =
  /\blocalStorage\.(?:getItem|setItem|removeItem)\s*\(\s*[`"']wedding_v1_/;

function main() {
  const args = process.argv.slice(2);
  const enforce = args.includes("--enforce");
  const baselineArg = args.find((a) => a.startsWith("--baseline="));
  const baseline = baselineArg ? Number(baselineArg.split("=")[1]) : 0;

  const files = globSync("src/**/*.js", { cwd: ROOT });
  const hits = [];
  for (const rel of files) {
    const norm = rel.split(sep).join("/");
    if (ALLOW.has(norm)) continue;
    const text = readFileSync(join(ROOT, rel), "utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (PATTERN.test(lines[i])) hits.push(`  ${norm}:${i + 1}  ${lines[i].trim()}`);
    }
  }

  console.log(`\n[audit-storage-prefix] ${hits.length} raw wedding_v1_ access(es) outside storage layer.`);
  if (hits.length) {
    console.log(hits.join("\n"));
    console.log("\n  fix: route through src/core/storage.js helpers (load/save/remove).\n");
  }

  if (!enforce) {
    console.log("[audit-storage-prefix] Advisory mode (no failure). Re-run with --enforce to gate.");
    process.exit(0);
  }
  if (hits.length > baseline) {
    console.log(`[audit-storage-prefix] FAIL: ${hits.length} > baseline ${baseline}.`);
    process.exit(1);
  }
  console.log(`[audit-storage-prefix] OK: ${hits.length} ≤ baseline ${baseline}.`);
  process.exit(0);
}

main();
