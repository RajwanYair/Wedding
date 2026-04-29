#!/usr/bin/env node
/**
 * audit-base-section.mjs — Advisory inventory of sections that have NOT
 * yet adopted BaseSection (ADR-034).
 *
 * A section is considered "adopted" if its source file contains
 * `extends BaseSection` and uses `fromSection(`.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parseAuditArgs } from "./lib/audit-utils.mjs";

const ROOT = process.cwd();
const SECTIONS = join(ROOT, "src/sections");

const { enforce: ENFORCE } = parseAuditArgs();
const BASELINE = 0;

const files = readdirSync(SECTIONS).filter((n) => n.endsWith(".js"));

const adopted = [];
const pending = [];
for (const name of files) {
  const p = join(SECTIONS, name);
  const src = readFileSync(p, "utf8");
  const rel = relative(ROOT, p).split(sep).join("/");
  if (/extends\s+BaseSection\b/.test(src) && /fromSection\s*\(/.test(src)) {
    adopted.push(rel);
  } else {
    pending.push(rel);
  }
}

console.log(
  `[audit-base-section] adopted: ${adopted.length} / ${files.length}, pending: ${pending.length}`,
);
if (pending.length) {
  console.log("\nPending sections (ADR-034):");
  for (const p of pending.slice(0, 30)) console.log(`  ${p}`);
  if (pending.length > 30) console.log(`  …and ${pending.length - 30} more.`);
  console.log(
    "\n  fix: see docs/how-to/migrate-section-to-base.md",
  );
}

if (ENFORCE && pending.length > BASELINE) {
  console.log(
    `\n[audit-base-section] ENFORCE: ${pending.length} > baseline ${BASELINE}. Failing.`,
  );
  process.exit(1);
}
console.log(
  "\n[audit-base-section] Advisory mode (no failure). Re-run with --enforce to gate.",
);
process.exit(0);
