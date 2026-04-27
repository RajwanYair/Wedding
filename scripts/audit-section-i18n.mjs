#!/usr/bin/env node
/**
 * audit-section-i18n.mjs — Advisory coverage of `data-i18n` attributes
 * across `src/templates/*.html` and `src/modals/*.html`.
 *
 * Heuristic: count visible-text elements (h1-h6, p, button, label,
 * a, span, summary, legend, option, th, td) and compare to the count
 * carrying `data-i18n=`. Reports per-file ratio.
 *
 * NOT a parity check — that's `npm run check:i18n`. This is a *coverage*
 * metric for translatability.
 */

import { readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { walk } from "./lib/file-walker.mjs";
import { parseAuditArgs } from "./lib/audit-utils.mjs";

const ROOT = process.cwd();
const DIRS = ["src/templates", "src/modals"];

const { enforce: ENFORCE } = parseAuditArgs();
const BASELINE = 999;

const VISIBLE_TAGS = /<(h[1-6]|p|button|label|a|span|summary|legend|option|th|td)\b[^>]*>([^<]*[\p{L}\p{N}][^<]*)</giu;
const I18N_RE = /data-i18n\s*=/i;

const reports = [];
let totalVisible = 0;
let totalI18n = 0;

for (const d of DIRS) {
  const abs = join(ROOT, d);
  for (const file of walk(abs, ".html")) {
    const rel = relative(ROOT, file).split(sep).join("/");
    const src = readFileSync(file, "utf8");
    let visible = 0;
    let withI18n = 0;
    for (const m of src.matchAll(VISIBLE_TAGS)) {
      visible++;
      const tag = m[0];
      // openIdx points at start of opening tag in the file
      const openTag = tag.slice(0, tag.indexOf(">") + 1);
      if (I18N_RE.test(openTag)) withI18n++;
    }
    totalVisible += visible;
    totalI18n += withI18n;
    const ratio = visible === 0 ? 100 : Math.round((withI18n / visible) * 100);
    reports.push({ rel, visible, withI18n, ratio });
  }
}

reports.sort((a, b) => a.ratio - b.ratio);

const overall = totalVisible === 0 ? 100 : Math.round((totalI18n / totalVisible) * 100);
console.log(
  `[audit-section-i18n] ${totalI18n}/${totalVisible} visible-text nodes carry data-i18n (${overall}%).`,
);
console.log("\nBottom 10 files:");
for (const r of reports.slice(0, 10)) {
  console.log(`  ${r.ratio.toString().padStart(3)}%  ${r.withI18n}/${r.visible}  ${r.rel}`);
}

const missing = totalVisible - totalI18n;
if (ENFORCE && missing > BASELINE) {
  console.log(`\n[audit-section-i18n] ENFORCE: ${missing} > baseline ${BASELINE}. Failing.`);
  process.exit(1);
}
console.log("\n[audit-section-i18n] Advisory mode (no failure). Re-run with --enforce to gate.");
process.exit(0);
