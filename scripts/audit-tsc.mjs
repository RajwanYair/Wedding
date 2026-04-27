#!/usr/bin/env node
/**
 * scripts/audit-tsc.mjs — Advisory TypeScript error counter.
 *
 * Runs `tsc --noEmit` against the JS+TS sources (per `tsconfig.json` with
 * `checkJs`) and reports the error count. ROADMAP §3.3 / Phase B2 targets
 * strict TS in `core/`, `services/`, `handlers/`. This audit lets the count
 * trend visibly downward.
 *
 * Advisory mode (default): always exits 0.
 * Pass `--enforce` to exit 1 when count exceeds `--baseline=N`.
 *
 * Usage:
 *   node scripts/audit-tsc.mjs
 *   node scripts/audit-tsc.mjs --enforce --baseline=323
 */

import { spawnSync } from "node:child_process";

function main() {
  const args = process.argv.slice(2);
  const enforce = args.includes("--enforce");
  const baselineArg = args.find((a) => a.startsWith("--baseline="));
  const baseline = baselineArg ? Number(baselineArg.split("=")[1]) : 0;

  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsc", "--noEmit", "--pretty", "false"],
    { encoding: "utf8", shell: true, maxBuffer: 32 * 1024 * 1024 },
  );
  const out = (result.stdout ?? "") + (result.stderr ?? "");
  const errCount = (out.match(/error TS\d+:/g) ?? []).length;

  console.log(`\n[audit-tsc] ${errCount} TypeScript error(s) reported by tsc --noEmit.`);

  if (!enforce) {
    console.log("[audit-tsc] Advisory mode (no failure). Re-run with --enforce to gate.");
    process.exit(0);
  }
  if (errCount > baseline) {
    console.log(`[audit-tsc] FAIL: ${errCount} > baseline ${baseline}.`);
    process.exit(1);
  }
  console.log(`[audit-tsc] OK: ${errCount} ≤ baseline ${baseline}.`);
  process.exit(0);
}

main();
