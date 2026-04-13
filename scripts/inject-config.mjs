#!/usr/bin/env node
/**
 * inject-config.mjs — Replace hardcoded config values in js/config.js from
 * environment variables, for deployment via GitHub Actions.
 *
 * Each env variable is optional.  If unset the constant is left unchanged,
 * so local development continues to work without any secrets in the environment.
 *
 * Environment variables → JS constants patched:
 *   GH_GOOGLE_CLIENT_ID   → GOOGLE_CLIENT_ID
 *   GH_FB_APP_ID          → FB_APP_ID
 *   GH_APPLE_SERVICE_ID   → APPLE_SERVICE_ID
 *   GH_SHEETS_WEBAPP_URL  → SHEETS_WEBAPP_URL
 *   GH_SPREADSHEET_ID     → SPREADSHEET_ID
 *
 * Called by .github/workflows/deploy.yml before the Pages artifact is uploaded.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const CONFIG_PATH = resolve(ROOT, "js", "config.js");

/** @type {Array<[envVar: string, jsConst: string]>} */
const SUBSTITUTIONS = [
  ["GH_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID"],
  ["GH_FB_APP_ID", "FB_APP_ID"],
  ["GH_APPLE_SERVICE_ID", "APPLE_SERVICE_ID"],
  ["GH_SHEETS_WEBAPP_URL", "SHEETS_WEBAPP_URL"],
  ["GH_SPREADSHEET_ID", "SPREADSHEET_ID"],
];

let src = readFileSync(CONFIG_PATH, "utf8");
let changed = 0;

for (const [envVar, jsConst] of SUBSTITUTIONS) {
  const val = process.env[envVar];
  if (!val) continue;

  // Escape special regex/replacement characters in the injected value
  const escapedVal = val.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  // Match:  const CONST_NAME = "anything";  (double-quoted only in config.js)
  const re = new RegExp(`(const ${jsConst}\\s*=\\s*)"[^"]*"`);
  if (re.test(src)) {
    src = src.replace(re, `$1"${escapedVal}"`);
    changed++;
    console.log(`  ✓ Injected ${jsConst} from $${envVar}`);
  } else {
    console.warn(`  ⚠ Pattern for ${jsConst} not found in config.js — skipped`);
  }
}

if (changed > 0) {
  writeFileSync(CONFIG_PATH, src, "utf8");
  console.log(`\nConfig injection complete: ${changed} value(s) updated.`);
} else {
  console.log("No secrets set — config.js left unchanged (local dev mode).");
}
