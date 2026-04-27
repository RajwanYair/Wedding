#!/usr/bin/env node
/**
 * audit-manual-chunks.mjs — ADR-041 advisory.
 *
 * Reports the number of explicit `manualChunks` rules in vite.config.js.
 * Advisory until ADR-041 phase MC3, then `--enforce` flips it to a hard
 * gate (any non-zero count fails).
 *
 * Detection is intentionally simple: count `id.includes(` calls inside
 * `manualChunks` blocks. False positives are acceptable in advisory
 * mode; they become a deletion target on the path to MC3.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseAuditArgs } from "./lib/audit-utils.mjs";

const REPO_ROOT = process.cwd();
const VITE_FILE = join(REPO_ROOT, "vite.config.js");
const BASELINE = 8; // current rule count; must not grow; target: 0 (ADR-041 MC3)

const { enforce } = parseAuditArgs();

if (!existsSync(VITE_FILE)) {
  console.error("[audit:manual-chunks] vite.config.js not found");
  process.exit(0);
}

const src = readFileSync(VITE_FILE, "utf8");

// Find each `manualChunks` block and the rules inside it.
const blockRe = /manualChunks\s*[({][\s\S]*?\n\s*[})]/g;
let total = 0;
let blocks = 0;
const samples = [];

for (const match of src.matchAll(blockRe)) {
  blocks++;
  const block = match[0];
  const ruleRe = /id\.includes\(["']([^"']+)["']\)/g;
  for (const rule of block.matchAll(ruleRe)) {
    total++;
    if (samples.length < 10) samples.push(rule[1]);
  }
}

console.log("=== audit:manual-chunks (advisory; ADR-041) ===\n");

if (blocks === 0) {
  console.log("✅ No `manualChunks` block in vite.config.js — MC3 reached.");
  process.exit(0);
}

console.log(`Found ${blocks} \`manualChunks\` block(s) with ${total} rule(s).`);
if (samples.length) {
  console.log("\nSample rules:");
  for (const s of samples) console.log(`  • ${s}`);
}

console.log(`\nBaseline gate: ${BASELINE} (advisory). Phase MC3 (ADR-041) flips to --enforce.`);

if (enforce && total > 0) {
  console.error(`\n❌ --enforce: ${total} rule(s) present (target: 0).`);
  process.exit(1);
}
process.exit(0);
