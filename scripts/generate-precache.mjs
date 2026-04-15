#!/usr/bin/env node
/**
 * generate-precache.mjs — S4.4
 *
 * Scans dist/ after `npm run build` and:
 *   1. Writes dist/precache-manifest.json (hashes + sizes)
 *   2. Patches dist/sw.js → replaces APP_SHELL with full build list
 *      (only non-.map URLs <= 1 MB, excluding precache-manifest.json itself)
 *
 * Usage:  node scripts/generate-precache.mjs
 * Auto:   runs via `postbuild` npm hook after `npm run build`
 */

import { createHash } from "node:crypto";
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  statSync,
  existsSync,
} from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const DIST = resolve(ROOT, "dist");
const BASE = "/Wedding/";
const MAX_CACHE_BYTES = 1_000_000; // skip files > 1 MB (e.g. source maps)

if (!existsSync(DIST)) {
  console.error(
    "[generate-precache] dist/ not found — run `npm run build` first.",
  );
  process.exit(1);
}

function sha384(filePath) {
  return `sha384-${createHash("sha384")
    .update(readFileSync(filePath))
    .digest("base64")}`;
}

function walk(dir, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else {
      const size = statSync(full).size;
      if (size <= MAX_CACHE_BYTES) results.push(full);
    }
  }
  return results;
}

const files = walk(DIST);
const manifest = files.map(function (fp) {
  const url = BASE + relative(DIST, fp).replace(/\\/g, "/");
  const hash = sha384(fp);
  const size = statSync(fp).size;
  return { url, hash, size };
});

// Write manifest JSON
const outPath = resolve(DIST, "precache-manifest.json");
writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(
  `[generate-precache] Wrote ${manifest.length} entries → dist/precache-manifest.json`,
);

// ── Patch dist/sw.js APP_SHELL ────────────────────────────────────────────────
const swPath = resolve(DIST, "sw.js");
if (existsSync(swPath)) {
  const shellUrls = manifest
    .filter(function (e) {
      return (
        !e.url.endsWith(".map") &&
        !e.url.endsWith("precache-manifest.json") &&
        !e.url.endsWith("sw.js")
      );
    })
    .map(function (e) {
      return `  "${e.url}",`;
    });

  const shellArrayText = `const APP_SHELL = [\n${shellUrls.join("\n")}\n];`;

  let sw = readFileSync(swPath, "utf8");
  // Replace the existing APP_SHELL block
  sw = sw.replace(/const APP_SHELL = \[[\s\S]*?\];/, shellArrayText);
  writeFileSync(swPath, sw);
  console.log(
    `[generate-precache] Patched dist/sw.js APP_SHELL (${shellUrls.length} entries)`,
  );
}

// Print summary
const shellUrls = manifest
  .filter(function (e) {
    return !e.url.endsWith(".map");
  })
  .map(function (e) {
    return `  "${e.url}",`;
  });

console.log("\n// APP_SHELL array (patched into dist/sw.js):\n");
console.log("const APP_SHELL = [");
shellUrls.forEach(function (line) {
  console.log(line);
});
console.log("];\n");

console.log(`Total precache entries  : ${manifest.length}`);
console.log(
  `Total size (uncompressed): ${(
    manifest.reduce(function (s, e) {
      return s + e.size;
    }, 0) / 1024
  ).toFixed(1)} KB`,
);
