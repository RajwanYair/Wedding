#!/usr/bin/env node
/**
 * scripts/audit-modals.mjs — S103/S233 native `<dialog>` migration tracker.
 *
 * Adoption is tracked at two levels:
 *   1. Shell-level  — `index.html` has a `<dialog id="*">` for the modal
 *      (the recommended architecture: empty shell + lazy-loaded template).
 *   2. Template-level — `src/modals/*.html` template file contains `<dialog>`
 *      (fully self-contained template, future migration target).
 *
 * A modal is counted as "adopted" if it has a shell-level `<dialog>` in
 * `index.html` (since `openModal()` already calls `showModal()` on those).
 *
 * Exits 0 always (advisory) unless `--baseline=N` is passed.
 */

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODALS_DIR = resolve(HERE, "../src/modals");
const INDEX_HTML = resolve(HERE, "../index.html");

const args = process.argv.slice(2);
const baselineArg = args.find((a) => a.startsWith("--baseline="));
const baseline = baselineArg ? Number(baselineArg.split("=")[1]) : null;

async function main() {
  const files = (await readdir(MODALS_DIR)).filter((f) => f.endsWith(".html"));
  const indexSrc = await readFile(INDEX_HTML, "utf8");

  // Extract modal IDs that have a native <dialog> shell in index.html.
  // Pattern: <dialog id="fooModal" ...> or <dialog id="galleryLightbox" ...>
  const shellRe = /<dialog\s[^>]*\bid="([^"]+)"/gi;
  /** @type {Set<string>} */
  const shellIds = new Set();
  let m;
  while ((m = shellRe.exec(indexSrc)) !== null) shellIds.add(m[1]);

  /** @type {string[]} */ const adopted = [];
  /** @type {string[]} */ const legacy = [];
  /** @type {string[]} */ const templateNative = [];

  for (const f of files) {
    const src = await readFile(resolve(MODALS_DIR, f), "utf8");
    const modalId = basename(f, ".html");
    const hasShell = shellIds.has(modalId);
    const hasTemplateDialog = /<dialog\b/i.test(src);

    if (hasShell || hasTemplateDialog) adopted.push(basename(f));
    else legacy.push(basename(f));

    if (hasTemplateDialog) templateNative.push(basename(f));
  }

  console.log("=== Modal <dialog> Adoption Audit (S103/S233) ===");
  console.log(`Modals scanned     : ${files.length}`);
  console.log(`Shell adopted      : ${adopted.length}  ${adopted.join(", ")}`);
  console.log(`Template-native    : ${templateNative.length}  ${templateNative.join(", ") || "(none yet)"}`);
  console.log(`Legacy (no shell)  : ${legacy.length}  ${legacy.join(", ") || "(none)"}`);

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
