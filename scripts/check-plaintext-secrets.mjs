#!/usr/bin/env node
/**
 * scripts/check-plaintext-secrets.mjs — Advisory scan for plaintext
 * credential / PII writes to localStorage (ADR-026 Phase E0).
 *
 * Reports any `localStorage.setItem("<sensitive_key>", …)` call site that
 * is NOT routed through `secure-storage.js`. Sensitive keys are taken
 * from `src/core/constants.js` (Critical/High tier).
 *
 * Advisory mode (default): always exits 0.
 * Pass `--enforce` to exit 1 on any violation (target: v12.0.0).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src";
const SENSITIVE_KEYS = [
  "wedding_v1_supabase_session",
  "wedding_v1_supabase_auth",
  "wedding_v1_greenApiToken",
  "wedding_v1_greenApiInstanceId",
  "wedding_v1_wa_phone_number_id",
];

const ALLOWLIST = new Set([
  // Files that legitimately route writes via secure-storage.
  "src/services/secure-storage.js",
  "src/core/storage.js",
]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".js")) out.push(full);
  }
  return out;
}

function main() {
  const enforce = process.argv.includes("--enforce");
  const files = walk(ROOT);
  const violations = [];

  for (const f of files) {
    const rel = f.replace(/\\/g, "/");
    if (ALLOWLIST.has(rel)) continue;
    const src = readFileSync(f, "utf8");
    for (const key of SENSITIVE_KEYS) {
      // Match: localStorage.setItem("<key>", …) or storage.set("<key>", …)
      const re = new RegExp(`(?:localStorage\\.setItem|storage\\.set)\\s*\\(\\s*['"\`]${key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}['"\`]`, "g");
      const matches = src.match(re);
      if (matches) {
        violations.push({ file: rel, key, count: matches.length });
      }
    }
  }

  console.log("\n[plaintext-secrets] Advisory scan (ADR-026):");
  console.log("─".repeat(60));
  if (violations.length === 0) {
    console.log("  ✅ no plaintext writes to sensitive keys.");
    process.exit(0);
  }
  for (const v of violations) {
    console.log(`  ⚠️  ${v.file} writes ${v.key} (${v.count}×)`);
  }
  console.log("─".repeat(60));
  console.log(`  ${violations.length} violation(s). Migrate to secure-storage.js.`);
  process.exit(enforce ? 1 : 0);
}

main();
