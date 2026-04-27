#!/usr/bin/env node
/**
 * scripts/lib/audit-utils.mjs — Shared CLI-argument parser for audit scripts.
 *
 * Every audit script needs the same small set of flags. Centralising the
 * parser here removes 1–4 duplicated `process.argv` lines from each script.
 */

/**
 * Parse common audit CLI flags from `argv`.
 *
 * Flags recognised:
 *   --enforce       Exit 1 when violations exceed baseline (default: advisory)
 *   --baseline=N    Override the hard-coded baseline (integer)
 *   --strict        Enable stricter checks (script-specific meaning)
 *   --show-dead     Also report unused / dead entries
 *   --json          Emit machine-readable JSON output
 *
 * @param {string[]} [argv] - Defaults to `process.argv`.
 * @returns {{ enforce: boolean, baseline: number, strict: boolean, showDead: boolean, json: boolean }}
 */
export function parseAuditArgs(argv = process.argv) {
  return {
    enforce: argv.includes("--enforce"),
    baseline: parseInt(
      argv.find((a) => a.startsWith("--baseline="))?.split("=")[1] ?? "0",
      10,
    ),
    strict: argv.includes("--strict"),
    showDead: argv.includes("--show-dead"),
    json: argv.includes("--json"),
  };
}
