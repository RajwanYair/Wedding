#!/usr/bin/env node
/**
 * audit-store-mutation-depth.mjs — ADR-039 advisory.
 *
 * Flags suspect nested-mutation patterns that work today by accident
 * (because callers manually re-set the domain) but will be the only
 * supported path after the Preact Signals migration (ADR-039 SG3).
 *
 * Heuristics:
 * - `storeGet("guests")[…]…=` chained assignment (won't fire current
 *    Proxy reactivity).
 * - `storeGet("guests").push(…)` / `.splice(…)` mutating helpers
 *    without an accompanying `storeSet` on the same line/block.
 *
 * Advisory only.
 */
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { walk } from "./lib/file-walker.mjs";
import { parseAuditArgs } from "./lib/audit-utils.mjs";

const REPO_ROOT = process.cwd();
const SRC = join(REPO_ROOT, "src");
const { enforce } = parseAuditArgs();
const BASELINE = 999;

const CHAINED = /storeGet\(\s*["'][^"']+["']\s*\)\s*(?:\[[^\]]+\]|\.[a-zA-Z_]+)+\s*=/;
const MUTATING =
  /storeGet\(\s*["'][^"']+["']\s*\)\s*\.\s*(push|pop|shift|unshift|splice|sort|reverse)\(/;

const findings = [];

for (const file of walk(SRC, ".js")) {
  const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (CHAINED.test(ln)) {
      findings.push({ file: rel, line: i + 1, kind: "chained-assign", text: ln.trim() });
    } else if (MUTATING.test(ln)) {
      // Allow if the same statement also calls storeSet within 3 lines
      const window = lines.slice(i, i + 3).join("\n");
      if (!/storeSet\s*\(/.test(window)) {
        findings.push({ file: rel, line: i + 1, kind: "mutating-method", text: ln.trim() });
      }
    }
  }
}

console.log("=== audit:store-mutation-depth (advisory; ADR-039) ===\n");

if (findings.length === 0) {
  console.log("✅ No suspicious nested-mutation patterns found.");
  process.exit(0);
}

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

for (const [file, hits] of [...byFile].sort()) {
  console.log(`${file}  (${hits.length})`);
  for (const h of hits.slice(0, 5)) {
    console.log(`  L${h.line}  ${h.kind}: ${h.text}`);
  }
  if (hits.length > 5) console.log(`  …and ${hits.length - 5} more`);
}

console.log(`\nTotal: ${findings.length} suspicious site(s) across ${byFile.size} file(s).`);
console.log(`Baseline gate: ${BASELINE} (advisory). Phase SG3 (ADR-039) flips to --enforce.`);

if (enforce && findings.length > BASELINE) {
  console.error(`\n❌ --enforce: ${findings.length} > ${BASELINE}.`);
  process.exit(1);
}
process.exit(0);
