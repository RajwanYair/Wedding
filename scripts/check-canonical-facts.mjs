#!/usr/bin/env node
/**
 * S558 — assert AGENTS.md `## Canonical Facts` values are mirrored by
 * `.github/copilot-instructions.md` and `package.json`.  AGENTS.md is the
 * single source of truth; mismatches fail CI.
 *
 * Recognised facts (key: value pairs in AGENTS.md):
 *   version        → must equal package.json `version`
 *   tests          → must appear in `.github/copilot-instructions.md` Quick Facts table
 *   test_files     → must appear in `.github/copilot-instructions.md`
 *   utils          → must appear in `.github/copilot-instructions.md`
 *
 * Flags:
 *   --enforce      non-zero exit on mismatch (default: warn-only)
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const ENFORCE = process.argv.includes("--enforce");

const agents = readFileSync(`${ROOT}/AGENTS.md`, "utf8");
const copilot = readFileSync(`${ROOT}/.github/copilot-instructions.md`, "utf8");
const pkg = JSON.parse(readFileSync(`${ROOT}/package.json`, "utf8"));

const block = agents.match(/## Canonical Facts[\s\S]*?(?=\n## )/);
if (!block) {
  process.stderr.write(
    "[check:canonical-facts] AGENTS.md is missing `## Canonical Facts` block\n",
  );
  process.exit(1);
}

/** @type {Record<string, string>} */
const facts = {};
for (const line of block[0].split("\n")) {
  const m = line.match(/^- ([\w_]+):\s*`([^`]+)`/);
  if (m) facts[m[1]] = m[2];
}

const violations = [];
if (facts.version && facts.version !== pkg.version) {
  violations.push(
    `version mismatch: AGENTS.md=${facts.version}, package.json=${pkg.version}`,
  );
}
for (const key of ["tests", "test_files", "utils"]) {
  const v = facts[key];
  if (v && !copilot.includes(v)) {
    violations.push(
      `${key}=${v} (from AGENTS.md) not found in .github/copilot-instructions.md`,
    );
  }
}

process.stdout.write(
  `[check:canonical-facts] facts=${Object.keys(facts).length} violations=${violations.length}\n`,
);
for (const v of violations) process.stdout.write(`  - ${v}\n`);

if (ENFORCE && violations.length > 0) process.exit(1);
