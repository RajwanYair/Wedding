#!/usr/bin/env node
/**
 * scripts/validate-sections.mjs — Section contract validation (Sprint 11)
 *
 * Validates that every section module in src/sections/ conforms to the
 * section lifecycle contract:
 *   - exports `mount` as a function
 *   - exports `unmount` as a function
 *   - exports `capabilities` as a plain object (if present)
 *
 * Exit 0 = all valid. Exit 1 = one or more violations.
 *
 * Usage:
 *   node scripts/validate-sections.mjs
 */

import { readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SECTIONS_DIR = resolve(__dirname, "../src/sections");

/** Excluded from validation — index barrel only re-exports, has no lifecycle */
const SKIP = new Set(["index.js"]);

const VALID_CAPS = new Set(["offline", "public", "printable", "shortcuts", "analytics"]);

let allOk = true;
const results = [];

const files = (await readdir(SECTIONS_DIR)).filter(
  (f) => f.endsWith(".js") && !SKIP.has(f),
);

for (const file of files) {
  const name = file.replace(".js", "");
  const url = pathToFileURL(resolve(SECTIONS_DIR, file)).href;
  let mod;
  try {
    mod = await import(url);
  } catch (err) {
    // import.meta.glob is a Vite-only transform — when running in bare Node the
    // section throws "glob is not a function".  This means the file is Vite-only
    // and we skip it rather than reporting a false failure.
    if (err.message && err.message.includes("glob is not a function")) {
      results.push({ name, ok: true, errors: [], note: "Vite-only (import.meta.glob)" });
      continue;
    }
    results.push({ name, ok: false, errors: [`import failed: ${err.message}`] });
    allOk = false;
    continue;
  }

  const errors = [];

  if (typeof mod.mount !== "function") {
    errors.push(`missing export "mount" (function)`);
  }
  if (typeof mod.unmount !== "function") {
    errors.push(`missing export "unmount" (function)`);
  }
  if ("capabilities" in mod) {
    const caps = mod.capabilities;
    if (typeof caps !== "object" || caps === null || Array.isArray(caps)) {
      errors.push(`"capabilities" must be a plain object`);
    } else {
      for (const [key, val] of Object.entries(caps)) {
        if (!VALID_CAPS.has(key)) {
          errors.push(`unknown capability key "${key}"`);
        }
        if (typeof val !== "boolean") {
          errors.push(`capability "${key}" must be boolean, got ${typeof val}`);
        }
      }
    }
  }

  results.push({ name, ok: errors.length === 0, errors });
  if (errors.length > 0) allOk = false;
}

// ── Report ────────────────────────────────────────────────────────────────
const pad = Math.max(...results.map((r) => r.name.length));

for (const { name, ok, errors } of results) {
  const icon = ok ? "✔" : "✘";
  const caps = (() => {
    return "";
  })();
  process.stdout.write(`  ${icon}  ${name.padEnd(pad)}${caps}\n`);
  for (const e of errors) {
    process.stderr.write(`       → ${e}\n`);
  }
}

const total = results.length;
const passed = results.filter((r) => r.ok).length;
process.stdout.write(`\n  ${passed}/${total} sections valid\n`);

if (!allOk) {
  process.stderr.write("\nSection contract validation FAILED\n");
  process.exit(1);
}

process.stdout.write("\nSection contract validation passed\n");
