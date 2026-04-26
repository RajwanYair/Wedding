#!/usr/bin/env node
/**
 * scripts/arch-check.mjs — Architectural-boundary lint (advisory)
 *
 * ROADMAP §5 Phase A — sections must eventually go through `src/repositories/`
 * for backend reads/writes. This script enumerates current violations so the
 * migration can be tracked and gated incrementally.
 *
 * Exit codes:
 *   0  no violations OR --warn passed (advisory mode)
 *   1  violations + --strict passed
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SECTIONS_DIR = join(ROOT, "src", "sections");

/** Forbidden import targets when read from src/sections/*.js */
const FORBIDDEN = [
  "../services/sheets.js",
  "../services/sheets-impl.js",
  "../services/backend.js",
  "../services/supabase.js",
  "../services/supabase-auth.js",
  "../services/supabase-realtime.js",
];

const STRICT = process.argv.includes("--strict");

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listJs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  /** @type {string[]} */
  const out = [];
  for (const e of entries) {
    if (e.isDirectory()) out.push(...(await listJs(join(dir, e.name))));
    else if (e.name.endsWith(".js")) out.push(join(dir, e.name));
  }
  return out;
}

const files = await listJs(SECTIONS_DIR);
/** @type {Array<{ file: string, line: number, target: string }>} */
const violations = [];
for (const file of files) {
  const text = await readFile(file, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const target of FORBIDDEN) {
      if (line.includes(`"${target}"`) || line.includes(`'${target}'`)) {
        violations.push({ file: file.replace(ROOT, "."), line: idx + 1, target });
      }
    }
  });
}

if (violations.length === 0) {
  console.log("✓ arch-check: no section→service direct imports.");
  process.exit(0);
}

console.log(`arch-check: ${violations.length} section→service direct import(s):`);
for (const v of violations) {
  console.log(`  ${v.file}:${v.line}  ${v.target}`);
}
console.log("");
console.log("Sections should use src/repositories/ instead of importing services directly.");
console.log("This script is advisory by default; run with --strict to fail CI.");
process.exit(STRICT ? 1 : 0);
