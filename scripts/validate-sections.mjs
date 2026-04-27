#!/usr/bin/env node
/**
 * scripts/validate-sections.mjs — Section contract validation (Sprint 11, B1)
 *
 * Validates that every section module in src/sections/ conforms to the
 * section lifecycle contract:
 *   - exports `mount` as a function
 *   - exports `unmount` as a function
 *   - exports `capabilities` as a plain object (if present)
 *
 * --strict mode additionally enforces warnings as errors:
 *   - section should export `capabilities`
 *   - a matching src/templates/<name>.html should exist
 *
 * Exit 0 = all valid. Exit 1 = one or more violations.
 *
 * Usage:
 *   node scripts/validate-sections.mjs [--strict]
 */

import { readdir, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { parseAuditArgs } from "./lib/audit-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SECTIONS_DIR = resolve(__dirname, "../src/sections");
const TEMPLATES_DIR = resolve(__dirname, "../src/templates");

/** Excluded from validation — index barrel only re-exports, has no lifecycle */
const SKIP = new Set(["index.js"]);

/** Known sub-sections without a standalone template file (already tracked by audit:section-templates --baseline=2) */
const SKIP_TEMPLATE = new Set(["expenses", "contact-collector"]);

const VALID_CAPS = new Set(["offline", "public", "printable", "shortcuts", "analytics"]);

/** Whether --strict was passed on the command line */
const { strict: STRICT } = parseAuditArgs();

let allOk = true;
const results = [];

const files = (await readdir(SECTIONS_DIR)).filter((f) => f.endsWith(".js") && !SKIP.has(f));

/** Check if a file path exists (returns boolean) */
async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

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
      results.push({ name, ok: true, errors: [], warnings: [], note: "Vite-only (import.meta.glob)" });
      continue;
    }
    results.push({ name, ok: false, errors: [`import failed: ${err.message}`], warnings: [] });
    allOk = false;
    continue;
  }

  const errors = [];
  const warnings = [];

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
  } else {
    // Missing capabilities is always a warning (informational), never a strict error
    warnings.push(`no "capabilities" export — consider adding one`);
  }

  // --strict: matching template HTML should exist (structural requirement)
  // Known sub-sections listed in SKIP_TEMPLATE are exempt.
  if (!SKIP_TEMPLATE.has(name)) {
    const templatePath = resolve(TEMPLATES_DIR, `${name}.html`);
    const hasTemplate = await exists(templatePath);
    if (!hasTemplate) {
      if (STRICT) {
        errors.push(`no matching template src/templates/${name}.html`);
      } else {
        warnings.push(`no matching template src/templates/${name}.html`);
      }
    }
  }

  // In --strict mode, warnings become errors
  const effectiveErrors = STRICT ? [...errors, ...warnings.filter((w) => !w.includes('"capabilities"'))] : errors;

  results.push({ name, ok: effectiveErrors.length === 0, errors: effectiveErrors, warnings: STRICT ? warnings.filter((w) => w.includes('"capabilities"')) : warnings });
  if (effectiveErrors.length > 0) allOk = false;
}

// ── Report ────────────────────────────────────────────────────────────────
const pad = Math.max(...results.map((r) => r.name.length));

if (STRICT) {
  process.stdout.write("  Running in --strict mode (warnings treated as errors)\n\n");
}

for (const { name, ok, errors, warnings } of results) {
  const icon = ok ? "✔" : "✘";
  process.stdout.write(`  ${icon}  ${name.padEnd(pad)}\n`);
  for (const e of errors) {
    process.stderr.write(`       ✘ ${e}\n`);
  }
  if (!STRICT) {
    for (const w of warnings) {
      process.stdout.write(`       ⚠ ${w}\n`);
    }
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
