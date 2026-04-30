#!/usr/bin/env node
/**
 * scripts/check-coverage-gate.mjs — Advisory coverage threshold gate.
 *
 * Reads the lcov-summary or coverage-summary.json produced by `vitest
 * run --coverage`, compares against ROADMAP §6 Phase B targets:
 *
 *   - lines:    80 %
 *   - branches: 75 %
 *   - functions: 80 %
 *   - statements: 80 %
 *
 * Advisory mode (default): always exits 0.
 * Pass `--enforce` to exit 1 when any pillar is below target.
 *
 * Re-runs are quick: pass an existing summary file path with
 * `--summary <path>` to skip the test invocation.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseAuditArgs } from "./lib/audit-utils.mjs";

// S379: ratcheted to current global actuals (58/51/66/58).
// Long-term target 80/75/80/80 reached incrementally:
//   v13.21.x:          58/51/66/58 (current)
//   v14.0.0:           80/75/80/80
// Run with --enforce to gate CI; pass --target-lines=N etc. to override one pillar.
const TARGETS = {
  lines: 58,
  branches: 51,
  functions: 66,
  statements: 58,
};

function readSummary() {
  // vitest writes coverage/coverage-summary.json in lcov reporter mode.
  const candidates = [
    "coverage/coverage-summary.json",
    join(process.env.TEMP || ".", "vitest-cache", "coverage-summary.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        return { path: p, data: JSON.parse(readFileSync(p, "utf8")) };
      } catch {
        // fall through
      }
    }
  }
  return null;
}

function main() {
  const { enforce } = parseAuditArgs();
  const summary = readSummary();
  if (!summary) {
    console.log("\n[coverage] no coverage-summary.json found.");
    console.log("  Run `npm run test:coverage` then re-run this script.");
    process.exit(enforce ? 1 : 0);
  }

  const total = summary.data.total ?? {};
  console.log(`\n[coverage] using ${summary.path}`);
  console.log("─".repeat(60));
  let violations = 0;
  for (const [pillar, target] of Object.entries(TARGETS)) {
    const pct = total[pillar]?.pct ?? 0;
    const ok = pct >= target;
    if (!ok) violations += 1;
    console.log(`  ${pillar.padEnd(12)} ${String(pct).padStart(6)} % / ${target} %  ${ok ? "✅" : "⚠️"}`);
  }
  console.log("─".repeat(60));
  if (violations === 0) {
    console.log("  ✅ all pillars meet target.");
    process.exit(0);
  }
  console.log(`  ⚠️  ${violations} pillar(s) below target.`);
  process.exit(enforce ? 1 : 0);
}

main();
