#!/usr/bin/env node
/**
 * inject-config.mjs — Replace hardcoded config values in src/core/config.js
 * from environment variables, for deployment via GitHub Actions.
 *
 * Each env variable is optional.  If unset the constant is left unchanged,
 * so local development continues to work without any secrets in the environment.
 *
 * Environment variables → JS constants patched:
 *   GH_GOOGLE_CLIENT_ID   → GOOGLE_CLIENT_ID
 *   GH_APPLE_SERVICE_ID   → APPLE_SERVICE_ID
 *   GH_SHEETS_WEBAPP_URL  → SHEETS_WEBAPP_URL
 *   GH_SPREADSHEET_ID     → SPREADSHEET_ID
 *   GH_SUPABASE_URL       → SUPABASE_URL
 *   GH_SUPABASE_ANON_KEY  → SUPABASE_ANON_KEY
 *   GH_BACKEND_TYPE       → BACKEND_TYPE
 *   GH_ADMIN_EMAILS       → ADMIN_EMAILS  (comma-separated list → JS array literal)
 *
 * Called by .github/workflows/deploy.yml before the Pages artifact is uploaded.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const ESM_CONFIG = resolve(ROOT, "src", "core", "config.js");

/** @type {Array<[envVar: string, jsConst: string]>} */
const SUBSTITUTIONS = [
  ["GH_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID"],
  ["GH_APPLE_SERVICE_ID", "APPLE_SERVICE_ID"],
  ["GH_SHEETS_WEBAPP_URL", "SHEETS_WEBAPP_URL"],
  ["GH_SPREADSHEET_ID", "SPREADSHEET_ID"],
  ["GH_SUPABASE_URL", "SUPABASE_URL"],
  ["GH_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"],
  ["GH_BACKEND_TYPE", "BACKEND_TYPE"],
];

/**
 * Patch a single config file, replacing `const NAME = "...";` patterns.
 * @param {string} filePath
 * @param {string} label  Human-readable label for console output
 * @returns {number} Number of values injected
 */
function patchFile(filePath, label) {
  if (!existsSync(filePath)) {
    console.warn(`  ⚠ ${label} not found — skipped`);
    return 0;
  }
  let src = readFileSync(filePath, "utf8");
  let changed = 0;

  for (const [envVar, jsConst] of SUBSTITUTIONS) {
    const val = process.env[envVar];
    if (!val) continue;

    // Escape special regex/replacement characters in the injected value
    const escapedVal = val.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    // Match: export const NAME = "...";  OR  const NAME = "...";  (double-quoted)
    const re = new RegExp(`((?:export\\s+)?const ${jsConst}\\s*=\\s*)"[^"]*"`);
    if (re.test(src)) {
      src = src.replace(re, `$1"${escapedVal}"`);
      changed++;
      console.log(`  ✓ [${label}] Injected ${jsConst} from $${envVar}`);
    } else {
      console.warn(`  ⚠ [${label}] Pattern for ${jsConst} not found — skipped`);
    }
  }

  if (changed > 0) {
    writeFileSync(filePath, src, "utf8");
  }
  return changed;
}

/**
 * Inject GH_ADMIN_EMAILS (comma-separated) into the ADMIN_EMAILS array constant.
 * Pattern matched: `export const ADMIN_EMAILS = [...];` — full multiline array replaced.
 * @param {string} filePath
 * @returns {number}
 */
function patchAdminEmails(filePath) {
  const raw = process.env["GH_ADMIN_EMAILS"];
  if (!raw) return 0;

  if (!existsSync(filePath)) return 0;
  let src = readFileSync(filePath, "utf8");

  const emails = raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (emails.length === 0) return 0;

  const indent = "  ";
  const emailLines = emails.map((e) => `${indent}"${e.replace(/"/g, '\\"')}",`).join("\n");
  const arrayLiteral = `[\n${emailLines}\n]`;

  // Replace the whole ADMIN_EMAILS array (potentially multiline)
  const re = /(?:export\s+)?const\s+ADMIN_EMAILS\s*=\s*\[[^\]]*\]/s;
  if (re.test(src)) {
    src = src.replace(re, `export const ADMIN_EMAILS = ${arrayLiteral}`);
    writeFileSync(filePath, src, "utf8");
    console.log(
      `  ✓ [src/core/config.js] Injected ADMIN_EMAILS (${emails.length} entries) from $GH_ADMIN_EMAILS`,
    );
    return 1;
  }
  console.warn("  ⚠ [src/core/config.js] ADMIN_EMAILS pattern not found — skipped");
  return 0;
}

const total = patchFile(ESM_CONFIG, "src/core/config.js") + patchAdminEmails(ESM_CONFIG);

if (total > 0) {
  console.log(`\nConfig injection complete: ${total} value(s) updated.`);
} else {
  console.log("No secrets set — config files left unchanged (local dev mode).");
}
