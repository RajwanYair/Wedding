#!/usr/bin/env node
/**
 * sri-check.mjs — Compute SRI (SHA-384) integrity hashes for all local JS/CSS assets.
 *
 * Usage:  node scripts/sri-check.mjs
 *
 * Outputs an integrity attribute line for every file in js/ and css/.
 * Paste the relevant hash into a <script integrity="…"> or <link integrity="…"> tag.
 *
 * Note: External scripts (Google GIS, Facebook, Apple SDK) CANNOT have SRI applied
 * without version-pinned URLs.  crossorigin="anonymous" is added to those tags instead.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const DIRS = ["src", "css"];
const EXTS = new Set([".js", ".css"]);

function computeSri(filePath) {
  const content = readFileSync(filePath);
  const hash = createHash("sha384").update(content).digest("base64");
  return `sha384-${hash}`;
}

const rows = [];

for (const dir of DIRS) {
  const dirPath = resolve(ROOT, dir);
  let files;
  try {
    files = readdirSync(dirPath);
  } catch {
    continue;
  }
  for (const file of files) {
    const ext = file.slice(file.lastIndexOf("."));
    if (!EXTS.has(ext)) continue;
    const fullPath = resolve(dirPath, file);
    const sri = computeSri(fullPath);
    const sizeKB = (statSync(fullPath).size / 1024).toFixed(1);
    rows.push({ path: `./${dir}/${file}`, sri, sizeKB });
  }
}

const COL_PATH = 38;
const COL_SZ = 8;

console.log("\nSRI Integrity Hashes — Wedding Manager\n");
console.log(
  "File".padEnd(COL_PATH),
  "Size".padStart(COL_SZ),
  '  integrity="…"',
);
console.log("-".repeat(COL_PATH + COL_SZ + 80));

for (const { path, sri, sizeKB } of rows) {
  console.log(
    path.padEnd(COL_PATH),
    (`${sizeKB  } KB`).padStart(COL_SZ),
    " ",
    sri,
  );
}

console.log("\nUsage in HTML:");
console.log('  <script type="module" src="./src/main.js"');
console.log('          integrity="sha384-<hash above>"');
console.log('          crossorigin="anonymous"></script>\n');

console.log("External scripts (not version-pinned — SRI not applicable):");
console.log(
  '  https://accounts.google.com/gsi/client   → crossorigin="anonymous" only',
);
console.log(
  "  https://connect.facebook.net/…/sdk.js    → loaded dynamically by auth.js",
);
console.log(
  "  https://appleid.cdn-apple.com/…/auth.js  → loaded dynamically by auth.js\n",
);

/* ── S4.3: Also scan dist/ build output if it exists ── */
import { existsSync } from "node:fs";
const DIST = resolve(ROOT, "dist", "assets");
if (existsSync(DIST)) {
  const distFiles = readdirSync(DIST).filter(function (f) {
    return f.endsWith(".js") || f.endsWith(".css");
  });
  if (distFiles.length) {
    console.log("\nBuild Output SRI (dist/assets/)\n");
    console.log("File".padEnd(50), "Size".padStart(10), "  integrity");
    console.log("-".repeat(120));
    for (const file of distFiles) {
      const fp = resolve(DIST, file);
      const sri = computeSri(fp);
      const sizeKB = (statSync(fp).size / 1024).toFixed(1);
      console.log(file.padEnd(50), (`${sizeKB  } KB`).padStart(10), " ", sri);
    }
  }
}
