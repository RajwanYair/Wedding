#!/usr/bin/env node
/**
 * inject-config.mjs — Replace hardcoded config values in BOTH js/config.js
 * and src/core/config.js from environment variables, for deployment via
 * GitHub Actions.
 *
 * Each env variable is optional.  If unset the constant is left unchanged,
 * so local development continues to work without any secrets in the environment.
 *
 * Environment variables → JS constants patched (in both files):
 *   GH_GOOGLE_CLIENT_ID   → GOOGLE_CLIENT_ID
 *   GH_FB_APP_ID          → FB_APP_ID
 *   GH_APPLE_SERVICE_ID   → APPLE_SERVICE_ID
 *   GH_SHEETS_WEBAPP_URL  → SHEETS_WEBAPP_URL
 *   GH_SPREADSHEET_ID     → SPREADSHEET_ID
 *   GH_SUPABASE_URL       → SUPABASE_URL
 *   GH_SUPABASE_ANON_KEY  → SUPABASE_ANON_KEY
 *   GH_BACKEND_TYPE       → BACKEND_TYPE
 *
 * Called by .github/workflows/deploy.yml before the Pages artifact is uploaded.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const LEGACY_CONFIG = resolve(ROOT, "js", "config.js");
const ESM_CONFIG = resolve(ROOT, "src", "core", "config.js");

/** @type {Array<[envVar: string, jsConst: string]>} */
const SUBSTITUTIONS = [
  ["GH_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID"],
  ["GH_FB_APP_ID", "FB_APP_ID"],
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

const total =
  patchFile(LEGACY_CONFIG, "js/config.js") +
  patchFile(ESM_CONFIG, "src/core/config.js");

if (total > 0) {
  console.log(
    `\nConfig injection complete: ${total} value(s) updated across both config files.`,
  );
} else {
  console.log("No secrets set — config files left unchanged (local dev mode).");
}
