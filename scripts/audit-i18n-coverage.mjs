#!/usr/bin/env node
/**
 * scripts/audit-i18n-coverage.mjs — i18n usage coverage audit (Sprint 30)
 *
 * Cross-checks every t('key') call in src/**\/\*.js and every data-i18n="key"
 * attribute in src/**\/\*.html against src/i18n/he.json and src/i18n/en.json.
 *
 * Reports:
 *   • keys used in source but MISSING from he.json or en.json
 *   • (advisory) keys in he.json/en.json not used anywhere (dead keys)
 *
 * Usage:
 *   node scripts/audit-i18n-coverage.mjs
 *   node scripts/audit-i18n-coverage.mjs --enforce           # exit 1 on missing keys
 *   node scripts/audit-i18n-coverage.mjs --baseline=N        # fail only if missing > N
 *   node scripts/audit-i18n-coverage.mjs --show-dead         # also list dead keys
 *   node scripts/audit-i18n-coverage.mjs --json              # machine-readable output
 *
 * Exit codes:
 *   0  no missing keys, OR missing count ≤ baseline
 *   1  missing keys AND --enforce AND count > baseline
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAuditArgs } from "./lib/audit-utils.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC_DIR = join(ROOT, "src");
const I18N_DIR = join(ROOT, "src", "i18n");

const { enforce: ENFORCE, showDead: SHOW_DEAD, json: JSON_OUT, baseline: BASELINE } = parseAuditArgs();

// ── File walker ────────────────────────────────────────────────────────────

/**
 * @param {string} dir
 * @param {(f: string) => boolean} predicate
 * @returns {Promise<string[]>}
 */
async function walk(dir, predicate) {
  const entries = await readdir(dir, { withFileTypes: true });
  /** @type {string[]} */
  const out = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, predicate)));
    else if (predicate(e.name)) out.push(full);
  }
  return out;
}

// ── Extract keys from source files ────────────────────────────────────────

const JS_T_RE = /\bt\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
const HTML_DATA_I18N_RE = /data-i18n=["']([^"']+)["']/g;

/**
 * @param {string} source
 * @param {RegExp} re
 * @returns {string[]}
 */
function extractMatches(source, re) {
  /** @type {string[]} */
  const keys = [];
  let m;
  // Reset lastIndex before use
  const r = new RegExp(re.source, re.flags);
  while ((m = r.exec(source)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

// ── Main ───────────────────────────────────────────────────────────────────

// Load primary locales
const [heRaw, enRaw] = await Promise.all([
  readFile(join(I18N_DIR, "he.json"), "utf8"),
  readFile(join(I18N_DIR, "en.json"), "utf8"),
]);
const heKeys = new Set(Object.keys(JSON.parse(heRaw)));
const enKeys = new Set(Object.keys(JSON.parse(enRaw)));

// Collect all source files
const [jsFiles, htmlFiles] = await Promise.all([
  walk(SRC_DIR, (n) => n.endsWith(".js")),
  walk(SRC_DIR, (n) => n.endsWith(".html")),
]);

/** @type {Map<string, string[]>} key → files where it appears */
const usedKeys = new Map();

for (const file of jsFiles) {
  const src = await readFile(file, "utf8");
  const keys = extractMatches(src, JS_T_RE);
  const rel = file.replace(`${ROOT}\\`, "").replace(`${ROOT}/`, "");
  for (const k of keys) {
    if (!usedKeys.has(k)) usedKeys.set(k, []);
    usedKeys.get(k).push(rel);
  }
}

for (const file of htmlFiles) {
  const src = await readFile(file, "utf8");
  const keys = extractMatches(src, HTML_DATA_I18N_RE);
  const rel = file.replace(`${ROOT}\\`, "").replace(`${ROOT}/`, "");
  for (const k of keys) {
    if (!usedKeys.has(k)) usedKeys.set(k, []);
    usedKeys.get(k).push(rel);
  }
}

// ── Analysis ───────────────────────────────────────────────────────────────

/** @type {{ key: string, files: string[], missingIn: string[] }[]} */
const missing = [];

for (const [key, files] of usedKeys) {
  // Skip dynamic keys — template expressions resolved at runtime (e.g., t(`meal_${g.meal}`))
  if (key.includes("${")) continue;
  const missingIn = [];
  if (!heKeys.has(key)) missingIn.push("he");
  if (!enKeys.has(key)) missingIn.push("en");
  if (missingIn.length > 0) {
    missing.push({ key, files: [...new Set(files)], missingIn });
  }
}

missing.sort((a, b) => a.key.localeCompare(b.key));

/** @type {string[]} */
const deadKeys = [];
if (SHOW_DEAD) {
  for (const k of heKeys) {
    if (!usedKeys.has(k)) deadKeys.push(k);
  }
  deadKeys.sort();
}

// ── Output ────────────────────────────────────────────────────────────────

if (JSON_OUT) {
  process.stdout.write(
    JSON.stringify({ missingCount: missing.length, missing, deadCount: deadKeys.length, deadKeys }, null, 2),
  );
  process.stdout.write("\n");
} else {
  if (missing.length === 0) {
    console.log(`audit:i18n-coverage — ✓ all ${usedKeys.size} used keys found in he + en`);
  } else {
    console.log(`audit:i18n-coverage — ${missing.length} key(s) missing from he/en locales:`);
    for (const { key, files, missingIn } of missing) {
      console.log(`  ✗ "${key}" — missing in: ${missingIn.join(", ")}`);
      for (const f of files.slice(0, 2)) console.log(`      ${f}`);
    }
  }
  if (SHOW_DEAD && deadKeys.length > 0) {
    console.log(`\naudit:i18n-coverage — ${deadKeys.length} potentially dead key(s) in he.json:`);
    for (const k of deadKeys.slice(0, 20)) console.log(`  ⚪ "${k}"`);
    if (deadKeys.length > 20) console.log(`  … and ${deadKeys.length - 20} more`);
  }
}

// ── Exit logic ────────────────────────────────────────────────────────────

if (ENFORCE && missing.length > BASELINE) {
  process.exit(1);
}
process.exit(0);
