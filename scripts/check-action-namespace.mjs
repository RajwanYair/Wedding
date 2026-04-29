#!/usr/bin/env node
/**
 * Action Namespace Advisory — ROADMAP §5.3 #4
 *
 * Reads `src/core/action-registry.js` (the canonical ACTIONS enum) and reports actions
 * that do not follow the `domain:verb` namespacing convention (e.g. `guests:save`,
 * `tables:add`).
 *
 * Currently advisory: emits a JSON report and a count of non-namespaced actions.
 * CI runs this with `continue-on-error: true`. Becomes a hard gate in v13.0.0
 * (ROADMAP §6 Phase B5 sibling).
 *
 * Exit codes:
 *  0 — report written, no namespacing failure surfaced as error.
 *  1 — could not read action registry (real failure).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REGISTRY = resolve(process.cwd(), "src/core/action-registry.js");
const ALLOWLIST = new Set([
  // Cross-cutting / lifecycle actions exempt from `domain:verb` rule.
  "showSection",
  "closeModal",
  "cycleTheme",
  "toggleLightMode",
  "toggleMobileNav",
  "signOut",
]);

let src;
try {
  src = readFileSync(REGISTRY, "utf8");
} catch (e) {
  console.error(`audit:action-namespace: cannot read ${REGISTRY}: ${e.message}`);
  process.exit(1);
}

// Parse "KEY: \"value\"" lines from inside ACTIONS = ({ ... }).
const actions = [];
const re = /^\s*[A-Z0-9_]+\s*:\s*"([^"]+)"\s*,?\s*$/gm;
let m;
while ((m = re.exec(src)) !== null) actions.push(m[1]);

const namespaced = [];
const flat = [];
for (const a of actions) {
  if (ALLOWLIST.has(a)) continue;
  if (a.includes(":")) namespaced.push(a);
  else flat.push(a);
}

const report = {
  total: actions.length,
  exempt: actions.filter((a) => ALLOWLIST.has(a)).length,
  namespaced: namespaced.length,
  flat: flat.length,
  flatActions: flat,
};

const namespacePct = actions.length
  ? Math.round((namespaced.length / (actions.length - report.exempt)) * 100)
  : 0;

// Duplicate detection (S224)
const seen = new Map();
const duplicates = [];
for (const a of actions) {
  seen.set(a, (seen.get(a) ?? 0) + 1);
}
for (const [a, count] of seen) {
  if (count > 1) duplicates.push({ action: a, count });
}
if (duplicates.length) {
  console.error(`audit:action-namespace — DUPLICATE actions found:`);
  for (const d of duplicates) console.error(`  "${d.action}" × ${d.count}`);
  process.exit(1);
}

console.log(JSON.stringify({ ...report, duplicates: [] }, null, 2));
console.log(
  `audit:action-namespace — ${namespaced.length}/${actions.length - report.exempt} actions namespaced (${namespacePct}%); ${flat.length} pending migration. No duplicates found.`,
);

// S291: ratchet gate — fail if un-namespaced count exceeds baseline of 116.
// This prevents new flat actions from being added while migration is in progress.
const FLAT_BASELINE = 116;
if (flat.length > FLAT_BASELINE) {
  console.error(
    `audit:action-namespace — RATCHET EXCEEDED: ${flat.length} un-namespaced actions (baseline: ${FLAT_BASELINE}). Do not add new flat actions.`,
  );
  process.exit(1);
}
process.exit(0);
