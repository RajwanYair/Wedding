#!/usr/bin/env node
/**
 * scripts/lib/file-walker.mjs — Shared synchronous file-tree walker.
 *
 * Shared by audit scripts to avoid duplicating the same readdirSync/statSync
 * loop in every file. Automatically skips `node_modules/` and `dist/`.
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Synchronously walk `dir` recursively and collect file paths.
 *
 * @param {string}   dir  - Directory to walk.
 * @param {string}  [ext] - If given, only collect files whose name ends with
 *                          this string (e.g. `".js"` or `".html"`).
 * @param {string[]} [out] - Accumulator array (created internally if omitted).
 * @returns {string[]}
 */
export function walk(dir, ext = undefined, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(p, ext, out);
    } else if (!ext || name.endsWith(ext)) {
      out.push(p);
    }
  }
  return out;
}
