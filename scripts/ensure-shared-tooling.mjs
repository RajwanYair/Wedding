#!/usr/bin/env node
/**
 * ensure-shared-tooling.mjs
 *
 * Idempotent setup script that guarantees the local environment matches the
 * "shared tooling at MyScripts/" convention used by every script in this repo.
 *
 *   1. Ensures `../tooling/` exists (or recreates it from inlined defaults
 *      for standalone/CI checkouts).
 *   2. Ensures `node_modules/` exists in the project root. When the parent
 *      directory holds a populated `node_modules/` (the shared MyScripts/
 *      install), a Windows junction (or POSIX symlink) is created so Node's
 *      ESM resolver finds packages without walking up to ancestor dirs —
 *      Node 25's strict `legacyMainResolve` chokes on ancestor lookups for
 *      packages that omit an `exports` field (e.g. `@eslint/js`).
 *
 * Run automatically as a `prepare` script after `npm install`. Safe to invoke
 * directly: `node scripts/ensure-shared-tooling.mjs`.
 */

import { existsSync, mkdirSync, writeFileSync, symlinkSync, lstatSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const parentRoot = resolve(__dirname, "../..");
const toolingBase = resolve(parentRoot, "tooling");

// ── Step 1: Shared node_modules junction ─────────────────────────────────
const localModules = resolve(projectRoot, "node_modules");
const sharedModules = resolve(parentRoot, "node_modules");

function isJunctionOrLink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

if (!existsSync(localModules) && existsSync(sharedModules)) {
  try {
    if (process.platform === "win32") {
      execFileSync("cmd", ["/c", "mklink", "/J", localModules, sharedModules], {
        stdio: "inherit",
      });
    } else {
      symlinkSync(sharedModules, localModules, "dir");
    }
    console.log(`Linked ${localModules} -> ${sharedModules}`);
  } catch (err) {
    console.warn(`Could not create node_modules link: ${err.message}`);
  }
} else if (existsSync(localModules) && !isJunctionOrLink(localModules)) {
  console.log("node_modules is a real directory (standalone install) - leaving as-is.");
}

// ── Step 2: Shared tooling configs ───────────────────────────────────────
if (existsSync(toolingBase)) {
  console.log("Shared tooling already present - skipping config shim.");
  process.exit(0);
}

console.log("Creating shared tooling shim (CI mode)...");

const stylelintDir = resolve(toolingBase, "stylelint");
mkdirSync(stylelintDir, { recursive: true });
writeFileSync(
  resolve(stylelintDir, "base.json"),
  JSON.stringify(
    {
      rules: {
        "block-no-empty": true,
        "color-no-invalid-hex": true,
        "declaration-block-no-duplicate-properties": [
          true,
          {
            ignore: [
              "consecutive-duplicates-with-different-values",
              "consecutive-duplicates-with-different-syntaxes",
            ],
          },
        ],
        "font-family-no-duplicate-names": true,
        "no-duplicate-at-import-rules": true,
        "selector-pseudo-class-no-unknown": [true, { ignorePseudoClasses: ["global"] }],
        "selector-pseudo-element-no-unknown": true,
        "unit-no-unknown": true,
        "no-descending-specificity": null,
        "no-duplicate-selectors": null,
        "selector-class-pattern": null,
        "keyframes-name-pattern": null,
        "custom-property-pattern": null,
        "value-keyword-case": ["lower", { camelCaseSvgKeywords: true }],
        "alpha-value-notation": "number",
        "color-function-notation": "legacy",
        "import-notation": "string",
        "rule-empty-line-before": null,
        "at-rule-empty-line-before": null,
        "comment-empty-line-before": null,
        "declaration-block-single-line-max-declarations": null,
        "color-function-alias-notation": null,
        "media-feature-range-notation": null,
        "shorthand-property-no-redundant-values": null,
      },
    },
    null,
    4,
  ),
);

const eslintDir = resolve(toolingBase, "eslint");
mkdirSync(eslintDir, { recursive: true });
writeFileSync(
  resolve(eslintDir, "base.mjs"),
  `// CI shim - exports null so eslint.config.mjs uses its inline fallbacks
export const baseLinterOptions = null;
export const baseLanguageOptions = null;
export const browserGlobals = null;
export const nodeGlobals = null;
export const testDomGlobals = null;
export const baseRules = null;
`,
);

console.log("Shared tooling shim created at", toolingBase);
