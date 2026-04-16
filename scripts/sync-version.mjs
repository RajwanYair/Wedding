#!/usr/bin/env node
/**
 * sync-version.mjs — Reads version from package.json and patches all doc/config files.
 * Usage: node scripts/sync-version.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const dryRun = process.argv.includes("--dry-run");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const ver = pkg.version; // e.g. "5.1.0"

/** Replace patterns in a file. Each rule: [regex, replacement string]. */
function patch(relPath, rules) {
  const abs = resolve(root, relPath);
  let content;
  try {
    content = readFileSync(abs, "utf8");
  } catch {
    console.warn(`  SKIP (not found): ${relPath}`);
    return;
  }
  let changed = false;
  for (const [re, replacement] of rules) {
    const next = content.replace(re, replacement);
    if (next !== content) {
      content = next;
      changed = true;
    }
  }
  if (changed) {
    if (dryRun) {
      console.log(`  DRY-RUN would patch: ${relPath}`);
    } else {
      writeFileSync(abs, content, "utf8");
      console.log(`  PATCHED: ${relPath}`);
    }
  } else {
    console.log(`  OK (already current): ${relPath}`);
  }
}

console.log(`Syncing version → v${ver}${dryRun ? " (dry-run)" : ""}\n`);

// src/core/config.js — APP_VERSION
patch("src/core/config.js", [
  [/APP_VERSION\s*=\s*["'][^"']+["']/, `APP_VERSION = "${ver}"`],
]);

// public/sw.js — CACHE_NAME
patch("public/sw.js", [
  [/CACHE_NAME\s*=\s*["']wedding-v[^"']+["']/, `CACHE_NAME = "wedding-v${ver}"`],
]);

// README.md — version badge
patch("README.md", [
  [/version-v[\d.]+-d4a574/, `version-v${ver}-d4a574`],
]);

// .github/copilot-instructions.md — Quick Facts version
patch(".github/copilot-instructions.md", [
  [/\| Version \| \*\*v[\d.]+\*\*/, `| Version | **v${ver}**`],
]);

// CHANGELOG.md — header (informational only)
patch("CHANGELOG.md", [
  [/^(# Changelog)$/m, `$1`], // no-op anchor — manual entry expected
]);

// ARCHITECTURE.md — h1 version
patch("ARCHITECTURE.md", [
  [/v[\d.]+\s*$/, `v${ver}`],
]);

console.log("\nDone.");
