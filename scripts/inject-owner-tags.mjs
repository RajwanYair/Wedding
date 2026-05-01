#!/usr/bin/env node
/**
 * S557 one-shot: inject `@owner <module>` JSDoc tags into every
 * `src/utils/*.js` file by scanning `src/` for import sites.  The
 * "owner" is the top-level subdirectory under `src/` that imports
 * the util most often; falls back to `shared` for orphan utils.
 *
 * Idempotent: skips files that already have an `@owner` tag.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const UTILS_DIR = join(ROOT, "src", "utils");
const SRC_DIR = join(ROOT, "src");

const OWNER_RE = /@owner\s+/i;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "coverage", ".vite"]);

/**
 * @param {string} dir
 * @param {Set<string>} extensions
 * @returns {string[]}
 */
function walk(dir, extensions) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full, extensions));
    else if (extensions.has(extname(full))) out.push(full);
  }
  return out;
}

const allSrc = walk(SRC_DIR, new Set([".js", ".mjs"]));

/**
 * Determine the dominant top-level module under `src/` that imports `utilName`.
 *
 * @param {string} utilBase
 * @returns {string}
 */
function dominantOwner(utilBase) {
  const re = new RegExp(`utils/${utilBase}(?:\\.js)?\\b`);
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const file of allSrc) {
    if (file.includes(`${UTILS_DIR}`)) continue;
    const src = readFileSync(file, "utf8");
    if (!re.test(src)) continue;
    // Top-level directory under src/.
    const rel = file.slice(SRC_DIR.length + 1).replace(/\\/g, "/");
    const top = rel.split("/")[0] ?? "shared";
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  if (counts.size === 0) return "shared";
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

let injected = 0;
let skipped = 0;
const utilFiles = readdirSync(UTILS_DIR).filter((f) => f.endsWith(".js"));
for (const f of utilFiles) {
  const full = join(UTILS_DIR, f);
  const base = f.replace(/\.js$/, "");
  const src = readFileSync(full, "utf8");
  if (OWNER_RE.test(src.split("\n").slice(0, 40).join("\n"))) {
    skipped += 1;
    continue;
  }
  const owner = dominantOwner(base);
  let next;
  if (src.startsWith("/**")) {
    // Inject before the closing `*/` of the leading docstring.
    const close = src.indexOf("*/");
    if (close === -1) {
      next = `/** @owner ${owner} */\n${src}`;
    } else {
      next = `${src.slice(0, close)}* @owner ${owner}\n ${src.slice(close)}`;
    }
  } else {
    next = `/** @owner ${owner} */\n${src}`;
  }
  writeFileSync(full, next, "utf8");
  injected += 1;
}

process.stdout.write(`[inject-owner-tags] injected ${injected}, skipped ${skipped}\n`);
