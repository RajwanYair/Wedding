#!/usr/bin/env node
/**
 * scripts/validate-i18n.mjs — i18n key parity validator (Phase 9.3)
 *
 * Checks that all 4 locale files (he/en/ar/ru) define identical key sets.
 * Exits with non-zero status when any mismatch is found so CI can block.
 *
 * Usage:
 *   node scripts/validate-i18n.mjs          # check parity only
 *   node scripts/validate-i18n.mjs --report # verbose per-locale report
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = join(__dir, "..", "src", "i18n");
const LOCALES = ["he", "en", "ar", "ru"];
const VERBOSE = process.argv.includes("--report");

// ── Load all locale files ─────────────────────────────────────────────────

/** @type {Map<string, Record<string, string>>} */
const data = new Map();
let loadError = false;

for (const locale of LOCALES) {
  const filePath = join(I18N_DIR, `${locale}.json`);
  try {
    const raw = readFileSync(filePath, "utf-8");
    data.set(locale, JSON.parse(raw));
  } catch (err) {
    console.error(`✗ Could not read ${locale}.json:`, err.message);
    loadError = true;
  }
}

if (loadError) process.exit(1);

// ── Extract flat key sets ─────────────────────────────────────────────────

/** @type {Map<string, Set<string>>} */
const keysets = new Map();
for (const [locale, obj] of data) {
  keysets.set(locale, new Set(Object.keys(obj)));
}

// ── Baseline: he.json is the canonical reference ──────────────────────────

const reference = LOCALES[0]; // "he"
const refKeys = /** @type {Set<string>} */ (keysets.get(reference));
let errors = 0;

// ── Compare all locales to reference ─────────────────────────────────────

for (const locale of LOCALES.slice(1)) {
  const keys = /** @type {Set<string>} */ (keysets.get(locale));
  /** @type {string[]} */
  const missing = [];
  /** @type {string[]} */
  const extra = [];

  for (const k of refKeys) {
    if (!keys.has(k)) missing.push(k);
  }
  for (const k of keys) {
    if (!refKeys.has(k)) extra.push(k);
  }

  if (missing.length === 0 && extra.length === 0) {
    if (VERBOSE) console.log(`✓ ${locale}.json — ${keys.size} keys, parity OK`);
    continue;
  }

  errors++;
  console.error(`✗ ${locale}.json — parity mismatch vs ${reference}.json:`);
  if (missing.length > 0) {
    console.error(`  MISSING (${missing.length}): ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? ` … +${missing.length - 20} more` : ""}`);
  }
  if (extra.length > 0) {
    console.error(`  EXTRA   (${extra.length}): ${extra.slice(0, 20).join(", ")}${extra.length > 20 ? ` … +${extra.length - 20} more` : ""}`);
  }
}

// ── Check for empty or placeholder values ─────────────────────────────────

for (const locale of LOCALES) {
  const obj = /** @type {Record<string, string>} */ (data.get(locale));
  /** @type {string[]} */
  const empty = [];
  for (const [k, v] of Object.entries(obj)) {
    if (!v || String(v).trim() === "") empty.push(k);
  }
  if (empty.length > 0) {
    console.warn(`⚠ ${locale}.json — ${empty.length} empty value(s): ${empty.slice(0, 10).join(", ")}`);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────

if (errors === 0) {
  const totalKeys = refKeys.size;
  console.log(`✓ i18n parity check passed — ${LOCALES.length} locales, ${totalKeys} keys each`);
  process.exit(0);
} else {
  console.error(`✗ i18n parity check FAILED — ${errors} locale(s) have mismatches`);
  process.exit(1);
}
