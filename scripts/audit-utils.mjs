#!/usr/bin/env node
/**
 * audit:utils — detects unused exports and missing @owner tags across `src/utils/`.
 *
 * Outputs a JSON report; non-zero exit when violations exceed the documented
 * baseline (used to ratchet down the 130-utility sprawl introduced by the
 * S444→S553 expansion cycles).
 *
 * Flags:
 *   --enforce        non-zero exit on any new violation above baseline
 *   --baseline N     override baseline (default: 0)
 *   --json           emit machine-readable JSON only
 *
 * Owner tag: each `src/utils/*.js` file SHOULD declare `@owner <module>` near
 * the top (within the first 40 lines). Modules: any subdirectory under `src/`
 * (e.g. `core`, `sections`, `services`, `repositories`, `handlers`, `shared`).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const UTILS_DIR = join(ROOT, "src", "utils");
const SRC_DIR = join(ROOT, "src");
const TESTS_DIR = join(ROOT, "tests");

const args = new Set(process.argv.slice(2));
const ENFORCE = args.has("--enforce");
const JSON_ONLY = args.has("--json");
const BASELINE_ARG = process.argv.find((a) => a.startsWith("--baseline="));
const BASELINE = BASELINE_ARG ? Number(BASELINE_ARG.split("=")[1]) : 0;

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  ".vite",
]);

/**
 * Walk a directory recursively and yield absolute file paths matching `extensions`.
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

const utilFiles = readdirSync(UTILS_DIR)
  .filter((f) => f.endsWith(".js"))
  .map((f) => join(UTILS_DIR, f));

const otherFiles = [
  ...walk(SRC_DIR, new Set([".js", ".ts", ".mjs"])),
  ...walk(TESTS_DIR, new Set([".js", ".mjs", ".ts"])),
];

/**
 * Read each consumer file once; per-util we test names against the global
 * merged source minus that util's own contribution.  Util-to-util imports
 * count as usage, but a file cannot satisfy its own export.
 */
const sourceByFile = new Map();
for (const f of otherFiles) sourceByFile.set(f, readFileSync(f, "utf8"));
const globalSrc = [...sourceByFile.values()].join("\n\n");
const selfSrcCache = new Map();
function consumerSrcFor(utilFile) {
  if (!selfSrcCache.has(utilFile)) {
    selfSrcCache.set(utilFile, sourceByFile.get(utilFile) ?? "");
  }
  return { global: globalSrc, self: selfSrcCache.get(utilFile) };
}

const EXPORT_RE =
  /export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+(\w+)/g;
const REEXPORT_RE = /export\s+\{\s*([^}]+?)\s*\}/g;
const OWNER_RE = /@owner\s+([\w./-]+)/i;

/** @type {{ file: string, name: string }[]} */
const unusedExports = [];
/** @type {{ file: string, missing: "owner" }[]} */
const missingOwner = [];
/** @type {{ file: string, sizeBytes: number, lines: number }[]} */
const sizes = [];

for (const file of utilFiles) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  const src = readFileSync(file, "utf8");
  const head = src.split("\n").slice(0, 40).join("\n");

  if (!OWNER_RE.test(head)) {
    missingOwner.push({ file: rel, missing: "owner" });
  }

  /** @type {Set<string>} */
  const exportNames = new Set();
  for (const m of src.matchAll(EXPORT_RE)) exportNames.add(m[1]);
  for (const m of src.matchAll(REEXPORT_RE)) {
    for (const part of m[1].split(",")) {
      const name = part.split(/\s+as\s+/i).pop()?.trim();
      if (name) exportNames.add(name);
    }
  }

  for (const name of exportNames) {
    const re = new RegExp(`\\b${name}\\b`);
    const { global, self } = consumerSrcFor(file);
    // Count occurrences in self vs global; if all matches are within self
    // (or none anywhere), the export is unused externally.
    const globalMatches = global.match(re);
    if (!globalMatches) {
      unusedExports.push({ file: rel, name });
      continue;
    }
    const selfHas = re.test(self);
    if (!selfHas) continue; // matches exist in some consumer → used
    // self has matches; check if any consumer OTHER than self matches
    const globalCount = (global.match(new RegExp(`\\b${name}\\b`, "g")) ?? [])
      .length;
    const selfCount = (self.match(new RegExp(`\\b${name}\\b`, "g")) ?? [])
      .length;
    if (globalCount <= selfCount) {
      unusedExports.push({ file: rel, name });
    }
  }

  sizes.push({
    file: rel,
    sizeBytes: Buffer.byteLength(src, "utf8"),
    lines: src.split("\n").length,
  });
}

const violations = unusedExports.length + missingOwner.length;

const report = {
  utils: utilFiles.length,
  unusedExports,
  missingOwner,
  largest: sizes.sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 10),
  totalViolations: violations,
  baseline: BASELINE,
};

if (JSON_ONLY) {
  process.stdout.write(JSON.stringify(report, null, 2));
} else {
  console.log(`[audit:utils] scanned ${utilFiles.length} files`);
  console.log(`  unused exports : ${unusedExports.length}`);
  console.log(`  missing @owner : ${missingOwner.length}`);
  console.log(`  baseline       : ${BASELINE}`);
  if (unusedExports.length > 0) {
    console.log("\nunused exports (sample, first 25):");
    for (const u of unusedExports.slice(0, 25)) {
      console.log(`  - ${u.file}  ::  ${u.name}`);
    }
    if (unusedExports.length > 25) {
      console.log(`  ... and ${unusedExports.length - 25} more`);
    }
  }
  if (missingOwner.length > 0) {
    console.log(`\nmissing @owner (sample, first 25):`);
    for (const u of missingOwner.slice(0, 25)) {
      console.log(`  - ${u.file}`);
    }
    if (missingOwner.length > 25) {
      console.log(`  ... and ${missingOwner.length - 25} more`);
    }
  }
}

if (ENFORCE && violations > BASELINE) {
  process.exit(1);
}
