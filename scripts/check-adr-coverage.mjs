#!/usr/bin/env node
/**
 * ADR Coverage Advisory — ROADMAP §3.4 ("ADR-per-Replace gate in CI")
 *
 * Counts ADR files in `docs/adr/NNN-*.md` and reports basic coverage stats.
 * Currently advisory: emits a JSON summary and exits 0.
 *
 * In v12.0.0 this becomes a hard gate that:
 *   - Reads every "Replace" verdict in ROADMAP.md §3 tables.
 *   - Asserts each has at least one ADR linking back to that decision.
 *   - Fails CI on a missing ADR.
 *
 * For v11.x we just emit the inventory so contributors see the catalogue
 * grow.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const ADR_DIR = resolve(process.cwd(), "docs/adr");

let entries;
try {
  entries = readdirSync(ADR_DIR);
} catch (e) {
  console.error(`audit:adrs: cannot read ${ADR_DIR}: ${e.message}`);
  process.exit(1);
}

const adrPattern = /^(\d{3})-[a-z0-9-]+\.md$/;
const adrs = entries
  .filter((f) => adrPattern.test(f))
  .map((file) => {
    const num = Number(file.match(adrPattern)[1]);
    const src = readFileSync(join(ADR_DIR, file), "utf8");
    const title = (src.match(/^#\s+ADR-\d+\s*[—-]\s*(.+?)$/m) ?? [])[1] ?? null;
    const status = (src.match(/\*\*Status:\*\*\s*([A-Za-z]+)/) ?? [])[1] ?? "Unknown";
    return { num, file, title, status };
  })
  .sort((a, b) => a.num - b.num);

const byStatus = adrs.reduce((acc, a) => {
  acc[a.status] = (acc[a.status] ?? 0) + 1;
  return acc;
}, {});

const expectedNumbers = adrs.length ? adrs.map((a) => a.num) : [];
const gaps = [];
for (
  let i = 1;
  expectedNumbers.length && i <= expectedNumbers[expectedNumbers.length - 1];
  i += 1
) {
  if (!expectedNumbers.includes(i)) gaps.push(i);
}

const report = {
  total: adrs.length,
  byStatus,
  gaps,
  adrs,
};

console.log(JSON.stringify(report, null, 2));
console.log(
  `audit:adrs — ${adrs.length} ADRs (${Object.entries(byStatus)
    .map(([s, n]) => `${s}: ${n}`)
    .join(", ")}); ${gaps.length} numbering gaps (advisory).`,
);
process.exit(0);
