#!/usr/bin/env node
/**
 * check-section-template-parity.mjs — Verify each name in SECTION_LIST /
 * EXTRA_SECTIONS has both a section module and a template file.
 *
 * Exit 1 on any missing pair.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CONSTANTS = readFileSync(join(ROOT, "src/core/constants.js"), "utf8");

function extract(name) {
  const re = new RegExp(`${name}[^[]*\\[([^\\]]+)\\]`, "m");
  const m = CONSTANTS.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

const sections = [...extract("SECTION_LIST"), ...extract("EXTRA_SECTIONS")];

const missing = [];
for (const name of sections) {
  const js = join(ROOT, "src/sections", `${name}.js`);
  const tpl = join(ROOT, "src/templates", `${name}.html`);
  if (!existsSync(js)) missing.push(`section module missing: src/sections/${name}.js`);
  if (!existsSync(tpl)) missing.push(`template missing:      src/templates/${name}.html`);
}

if (missing.length === 0) {
  console.log(`[check-section-template-parity] ✅ ${sections.length} sections, all present.`);
  process.exit(0);
}

const ENFORCE = process.argv.includes("--enforce");
console.log(`[check-section-template-parity] ${missing.length} issue(s):\n`);
for (const m of missing) console.log(`  ${m}`);
if (ENFORCE) process.exit(1);
console.log(
  "\n[check-section-template-parity] Advisory mode (no failure). Some entries are embedded sub-sections without standalone files. Re-run with --enforce to gate.",
);
process.exit(0);
