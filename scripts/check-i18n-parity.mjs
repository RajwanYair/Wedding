#!/usr/bin/env node
/**
 * scripts/check-i18n-parity.mjs — i18n key parity checker (Sprint 98)
 *
 * Compares translation JSON files to find keys that are missing in one or
 * more locales relative to a "primary" locale (default: he).
 *
 * Usage:
 *   node scripts/check-i18n-parity.mjs
 *   node scripts/check-i18n-parity.mjs --dir src/i18n --primary he
 *   node scripts/check-i18n-parity.mjs --json          # machine-readable output
 *
 * Exits 0 if all locales are in parity, 1 otherwise.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Argument parsing ──────────────────────────────────────────────────────

function parseArgs(args) {
  const opts = { dir: join(__dir, "..", "src", "i18n"), primary: "he", json: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dir" && args[i + 1]) {
      opts.dir = args[++i];
      continue;
    }
    if (args[i] === "--primary" && args[i + 1]) {
      opts.primary = args[++i];
      continue;
    }
    if (args[i] === "--json") opts.json = true;
  }
  return opts;
}

// ── Core logic (exported for tests) ──────────────────────────────────────

/**
 * Load all JSON locales from a directory.
 * @param {string} dir
 * @returns {Record<string, Record<string, string>>}
 */
export function loadTranslations(dir) {
  const result = {};
  for (const file of readdirSync(dir)) {
    if (extname(file) !== ".json") continue;
    const lang = basename(file, ".json");
    try {
      result[lang] = JSON.parse(readFileSync(join(dir, file), "utf8"));
    } catch {
      result[lang] = {};
    }
  }
  return result;
}

/**
 * Find keys missing in each locale relative to all other locales.
 * A key is "missing" if it appears in any locale but not in the given one.
 *
 * @param {Record<string, Record<string, string>>} translations
 * @returns {Record<string, string[]>} lang → missing keys
 */
export function findMissingKeys(translations) {
  const langs = Object.keys(translations);
  const allKeys = new Set(langs.flatMap((l) => Object.keys(translations[l])));
  /** @type {Record<string, string[]>} */
  const missing = {};
  for (const lang of langs) {
    const keys = new Set(Object.keys(translations[lang]));
    missing[lang] = [...allKeys].filter((k) => !keys.has(k)).sort();
  }
  return missing;
}

/**
 * Check parity across all locales.
 * @param {string} dir
 * @returns {{ ok: boolean, langs: string[], missing: Record<string, string[]>, totalMissing: number }}
 */
export function checkParity(dir) {
  const translations = loadTranslations(dir);
  const missing = findMissingKeys(translations);
  const totalMissing = Object.values(missing).reduce((n, arr) => n + arr.length, 0);
  return {
    ok: totalMissing === 0,
    langs: Object.keys(translations),
    missing,
    totalMissing,
  };
}

// ── CLI entry ─────────────────────────────────────────────────────────────

if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  const opts = parseArgs(process.argv.slice(2));
  const report = checkParity(opts.dir);

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (report.ok) {
    console.log(`✓ i18n parity OK — ${report.langs.join(", ")} — no missing keys`);
  } else {
    console.error(`✖ i18n parity FAIL — ${report.totalMissing} missing key(s)`);
    for (const [lang, keys] of Object.entries(report.missing)) {
      if (keys.length === 0) continue;
      console.error(`\n  ${lang} (${keys.length} missing):`);
      for (const k of keys) console.error(`    - ${k}`);
    }
  }

  process.exit(report.ok ? 0 : 1);
}
