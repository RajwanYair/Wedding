#!/usr/bin/env node
/**
 * size-report.mjs — Report raw and gzip sizes for all JS and CSS assets.
 *
 * Usage:
 *   node scripts/size-report.mjs          # report only
 *   node scripts/size-report.mjs --check  # exit 1 if any file exceeds threshold
 *
 * Thresholds (configurable via SIZE_LIMIT_JS_KB / SIZE_LIMIT_CSS_KB env vars):
 *   JS files:  100 KB each (raw)
 *   CSS files:  30 KB each (raw)
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzip as gzipCb } from "node:zlib";
import { promisify } from "node:util";

const gzip = promisify(gzipCb);

const CHECK_MODE = process.argv.includes("--check");
const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");

const JS_LIMIT = Number(process.env.SIZE_LIMIT_JS_KB ?? 100) * 1024;
const CSS_LIMIT = Number(process.env.SIZE_LIMIT_CSS_KB ?? 30) * 1024;

const DIRS = [
  { dir: "js", ext: ".js", limit: JS_LIMIT },
  { dir: "css", ext: ".css", limit: CSS_LIMIT },
];

async function main() {
  const rows = [];

  for (const { dir, ext, limit } of DIRS) {
    const dirPath = resolve(ROOT, dir);
    let files;
    try {
      files = readdirSync(dirPath);
    } catch {
      continue;
    }

    for (const file of files.filter((f) => f.endsWith(ext))) {
      const fp = resolve(dirPath, file);
      const content = readFileSync(fp);
      const raw = content.length;
      const gz = (await gzip(content)).length;
      rows.push({
        path: `./${dir}/${file}`,
        raw,
        gz,
        over: raw > limit,
      });
    }
  }

  /* Sort: largest first */
  rows.sort((a, b) => b.raw - a.raw);

  const totalRaw = rows.reduce((s, r) => s + r.raw, 0);
  const totalGz = rows.reduce((s, r) => s + r.gz, 0);

  const W = { path: 40, num: 9 };

  console.log("\n📦 Bundle Size Report — Wedding Manager\n");
  console.log(
    "File".padEnd(W.path),
    "Raw".padStart(W.num),
    "Gzip".padStart(W.num),
    "  Status",
  );
  console.log("-".repeat(W.path + W.num * 2 + 10));

  for (const r of rows) {
    const rawStr = (r.raw / 1024).toFixed(1) + " KB";
    const gzStr = (r.gz / 1024).toFixed(1) + " KB";
    const status = r.over ? "⚠ OVER LIMIT" : "✓";
    console.log(
      r.path.padEnd(W.path),
      rawStr.padStart(W.num),
      gzStr.padStart(W.num),
      " ",
      status,
    );
  }

  console.log("-".repeat(W.path + W.num * 2 + 10));
  console.log(
    "Total".padEnd(W.path),
    ((totalRaw / 1024).toFixed(1) + " KB").padStart(W.num),
    ((totalGz / 1024).toFixed(1) + " KB").padStart(W.num),
  );

  const overLimit = rows.filter((r) => r.over);

  if (overLimit.length > 0) {
    console.log(`\n⚠  ${overLimit.length} file(s) exceed size limits:`);
    for (const r of overLimit)
      console.log(`   ${r.path} (${(r.raw / 1024).toFixed(1)} KB)`);
    if (CHECK_MODE) {
      console.log("");
      process.exit(1);
    }
  } else {
    console.log(`\n✓  All ${rows.length} files within size limits.\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
