#!/usr/bin/env node
/**
 * scripts/audit-modals.mjs — S103 native `<dialog>` migration tracker.
 *
 * Reports how many modal templates use the new `<dialog>` element vs the
 * legacy `.modal-overlay` wrapper. Exits 0 always (advisory) unless
 * `--baseline=N` is passed and adoption is below the threshold.
 */

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODALS_DIR = resolve(HERE, "../src/modals");

const args = process.argv.slice(2);
const baselineArg = args.find((a) => a.startsWith("--baseline="));
const baseline = baselineArg ? Number(baselineArg.split("=")[1]) : null;

async function main() {
  const files = (await readdir(MODALS_DIR)).filter((f) => f.endsWith(".html"));
  /** @type {string[]} */ const adopted = [];
  /** @type {string[]} */ const legacy = [];
  for (const f of files) {
    const src = await readFile(resolve(MODALS_DIR, f), "utf8");
    if (/<dialog\b/i.test(src)) adopted.push(basename(f));
    else legacy.push(basename(f));
  }
  console.log("=== Modal <dialog> Adoption Audit (S103) ===");
  console.log(`Modals scanned : ${files.length}`);
  console.log(`<dialog>       : ${adopted.length}  ${adopted.join(", ")}`);
  console.log(`Legacy overlay : ${legacy.length}  ${legacy.join(", ")}`);
  if (baseline !== null && adopted.length < baseline) {
    console.error(
      `[audit-modals] ENFORCE FAIL: adopted=${adopted.length} < baseline=${baseline}`,
    );
    process.exit(1);
  }
  console.log(`[audit-modals] OK (baseline=${baseline ?? "advisory"})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
