#!/usr/bin/env node
/**
 * scripts/check-credentials.mjs — Credential hygiene check (S15)
 *
 * Scans src/core/config.js for patterns that indicate hardcoded credentials
 * were left in source instead of being injected via GH Secrets.
 *
 * Exits 1 if any sensitive constant contains a non-empty literal value,
 * so CI can fail the build before a production deployment.
 *
 * Usage:
 *   node scripts/check-credentials.mjs          # exits 0 OK, 1 = found issues
 *   node scripts/check-credentials.mjs --warn   # always exit 0, only warn
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_FILE = resolve(ROOT, "src", "core", "config.js");
const WARN_ONLY = process.argv.includes("--warn");

/**
 * Constants whose value MUST be empty string in source.
 * They should be injected at deploy time via inject-config.mjs.
 */
const MUST_BE_EMPTY = [
  "SHEETS_WEBAPP_URL",
  "SPREADSHEET_ID",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "GOOGLE_CLIENT_ID",
  "FB_APP_ID",
  "APPLE_SERVICE_ID",
];

/**
 * Known-safe hardcoded values (e.g. sheets URL used for local dev only).
 * Add the constant name here to exempt it from the check.
 */
const ALLOW_LIST = new Set([
  "BACKEND_TYPE", // 'sheets'|'supabase'|'none' — not secret
  "APP_VERSION",
  "STORAGE_PREFIX",
  "SHEETS_GUESTS_TAB",
  "SHEETS_TABLES_TAB",
  "SHEETS_CONFIG_TAB",
  "SHEETS_VENDORS_TAB",
  "SHEETS_EXPENSES_TAB",
  "SHEETS_RSVP_LOG_TAB",
  "AUTH_SESSION_DURATION_MS",
]);

if (!existsSync(CONFIG_FILE)) {
  console.error("check-credentials: config.js not found — skipped");
  process.exit(0);
}

const src = readFileSync(CONFIG_FILE, "utf8");

let failed = 0;

for (const name of MUST_BE_EMPTY) {
  if (ALLOW_LIST.has(name)) continue;
  // Match: export const NAME = "VALUE";
  const re = new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*"([^"]+)"`, "m");
  const match = re.exec(src);
  if (match && match[1].length > 0) {
    const preview = match[1].slice(0, 12) + (match[1].length > 12 ? "…" : "");
    const level = WARN_ONLY ? "WARN" : "ERROR";
    console.error(`check-credentials: [${level}] ${name} has a non-empty hardcoded value: "${preview}"`);
    console.error(`  → Move "${name}" to GitHub Secret GH_${name} and re-run scripts/inject-config.mjs`);
    if (!WARN_ONLY) failed++;
  }
}

// Check ADMIN_EMAILS — warn if it still contains personal emails
const adminRe = /export\s+const\s+ADMIN_EMAILS\s*=\s*\[([\s\S]*?)\]/m;
const adminMatch = adminRe.exec(src);
if (adminMatch) {
  const entries = adminMatch[1].match(/"([^"]+)"/g) ?? [];
  if (entries.length > 0) {
    const level = WARN_ONLY ? "WARN" : "ERROR";
    console.error(
      `check-credentials: [${level}] ADMIN_EMAILS contains ${entries.length} hardcoded email(s).`,
    );
    console.error(
      `  → Set GH_ADMIN_EMAILS secret (comma-separated) to inject the allowlist at deploy time.`,
    );
    if (!WARN_ONLY) failed++;
  }
}

if (failed > 0) {
  console.error(`\ncheck-credentials: ${failed} credential(s) need attention.`);
  process.exit(1);
} else {
  console.log("check-credentials: all checks passed.");
  process.exit(0);
}
