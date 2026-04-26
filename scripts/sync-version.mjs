#!/usr/bin/env node
/**
 * sync-version.mjs — Reads version from package.json and patches current doc/config files.
 * Usage: node scripts/sync-version.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const dryRun = process.argv.includes("--dry-run");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const ver = pkg.version;

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
patch("src/core/config.js", [[/APP_VERSION\s*=\s*["'][^"']+["']/, `APP_VERSION = "${ver}"`]]);

// public/sw.js — CACHE_NAME
patch("public/sw.js", [
  [/(Service Worker — Wedding Manager v)[\d.]+/, `$1${ver}`],
  [/CACHE_NAME\s*=\s*["']wedding-v[^"']+["']/, `CACHE_NAME = "wedding-v${ver}"`],
]);

// README.md — version badge
patch("README.md", [[/version-v[\d.]+-d4a574/, `version-v${ver}-d4a574`]]);

// .github/copilot-instructions.md — title + Quick Facts version
patch(".github/copilot-instructions.md", [
  [
    /# GitHub Copilot Instructions — Wedding Manager v[\d.]+/,
    `# GitHub Copilot Instructions — Wedding Manager v${ver}`,
  ],
  [/\| Version \| \*\*v[\d.]+\*\*/, `| Version | **v${ver}**`],
]);

// .github/copilot/config.json — welcome message version
patch(".github/copilot/config.json", [[/Wedding Manager v[\d.]+/, `Wedding Manager v${ver}`]]);

// .github/instructions/workspace.instructions.md — title version
patch(".github/instructions/workspace.instructions.md", [
  [/# Workspace — Wedding Manager v[\d.]+/, `# Workspace — Wedding Manager v${ver}`],
]);

// .github/workflows/ci.yml — header version
patch(".github/workflows/ci.yml", [
  [/# CI — Wedding Manager v[\d.]+/, `# CI — Wedding Manager v${ver}`],
]);

// tests/wedding.test.mjs — repo sanity suite version + version alignment assertions
patch("tests/wedding.test.mjs", [
  [/Repo Sanity Suite v[\d.]+/, `Repo Sanity Suite v${ver}`],
  [/(package\.json is v)[\d.]+/, `$1${ver}`],
  [/(APP_VERSION v)[\d.]+/, `$1${ver}`],
  [/(public\/sw\.js uses wedding-v)[\d.]+( cache)/, `$1${ver}$2`],
  [/(version badge references v)[\d.]+/, `$1${ver}`],
  [/(Copilot instructions title references v)[\d.]+/, `$1${ver}`],
  [/(ARCHITECTURE\.md header references v)[\d.]+/, `$1${ver}`],
  [/(src\/types\.d\.ts header references v)[\d.]+/, `$1${ver}`],
  [
    /assert\.equal\(packageJson\.version, "[\d.]+"\);/,
    `assert.equal(packageJson.version, "${ver}");`,
  ],
  [/APP_VERSION = "[\d.]+"/, `APP_VERSION = "${ver}"`],
  [/serviceWorker\.includes\("wedding-v[\d.]+"\)/, `serviceWorker.includes("wedding-v${ver}")`],
  [/readme\.includes\("version-v[\d.]+"\)/, `readme.includes("version-v${ver}")`],
  [
    /copilotInstructions\.includes\(\s*"# GitHub Copilot Instructions — Wedding Manager v[\d.]+",?\s*\)/s,
    `copilotInstructions.includes(\n        "# GitHub Copilot Instructions — Wedding Manager v${ver}",\n      )`,
  ],
  [
    /architecture\.includes\("# Wedding Manager — Architecture \(v[\d.]+\)"\)/,
    `architecture.includes("# Wedding Manager — Architecture (v${ver})")`,
  ],
  [
    /typesSource\.includes\(\s*"src\/types\.d\.ts — Shared type definitions for the Wedding Manager \(v[\d.]+\)",?\s*\)/s,
    `typesSource.includes(\n        "src/types.d.ts — Shared type definitions for the Wedding Manager (v${ver})",\n      )`,
  ],
]);

// AGENTS.md — app version reference
patch("AGENTS.md", [[/(Wedding Manager v)[\d.]+/, `$1${ver}`]]);

// ROADMAP.md — Current State heading
patch("ROADMAP.md", [[/(## Current State \(v)[\d.]+(\))/, `$1${ver}$2`]]);

// CHANGELOG.md — header (informational only)
patch("CHANGELOG.md", [
  [/^(# Changelog)$/m, `$1`], // no-op anchor — manual entry expected
]);

// ARCHITECTURE.md — h1 version
patch("ARCHITECTURE.md", [[/(# Wedding Manager — Architecture \(v)[\d.]+(\))/, `$1${ver}$2`]]);

// src/types.d.ts — header version
patch("src/types.d.ts", [
  [
    /(src\/types\.d\.ts — Shared type definitions for the Wedding Manager \(v)[\d.]+(\))/,
    `$1${ver}$2`,
  ],
]);

console.log("\nDone.");
