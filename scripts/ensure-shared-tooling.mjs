#!/usr/bin/env node
/**
 * ensure-shared-tooling.mjs
 *
 * Ensures the shared tooling configs exist at ../tooling/.
 * In local development they live in the parent MyScripts/tooling/ directory.
 * In CI (standalone checkout) they don't exist — this script recreates them
 * from embedded defaults so lint/test pipelines work without the parent workspace.
 *
 * Run: node scripts/ensure-shared-tooling.mjs
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolingBase = resolve(__dirname, "../../tooling");

if (existsSync(toolingBase)) {
  console.log("Shared tooling already present — skipping.");
  process.exit(0);
}

console.log("Creating shared tooling shim (CI mode)…");

// ── HTMLHint ──────────────────────────────────────────────────────────────
const htmlhintDir = resolve(toolingBase, "htmlhint");
mkdirSync(htmlhintDir, { recursive: true });
writeFileSync(
  resolve(htmlhintDir, ".htmlhintrc"),
  JSON.stringify(
    {
      "tagname-lowercase": true,
      "attr-lowercase": true,
      "attr-value-double-quotes": true,
      "doctype-first": true,
      "tag-pair": true,
      "spec-char-escape": false,
      "id-unique": true,
      "src-not-empty": true,
      "title-require": true,
      "alt-require": true,
      "doctype-html5": true,
      "style-disabled": false,
      "inline-style-disabled": false,
      "inline-script-disabled": false,
      "id-class-ad-disabled": true,
      "attr-unsafe-chars": true,
      "head-script-disabled": false,
    },
    null,
    2,
  ),
);

// ── Stylelint ─────────────────────────────────────────────────────────────
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
        "selector-pseudo-class-no-unknown": [
          true,
          { ignorePseudoClasses: ["global"] },
        ],
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

// ── ESLint base ───────────────────────────────────────────────────────────
// The ESLint config uses dynamic import with inline fallback in eslint.config.mjs,
// so we only need the dir to exist for the htmlhint/stylelint configs.
// Creating base.mjs here as well for consistency.
const eslintDir = resolve(toolingBase, "eslint");
mkdirSync(eslintDir, { recursive: true });
writeFileSync(
  resolve(eslintDir, "base.mjs"),
  `// CI shim — see MyScripts/tooling/eslint/base.mjs for canonical version
export const baseLinterOptions = { reportUnusedDisableDirectives: "error" };
export const baseLanguageOptions = { ecmaVersion: 2025, sourceType: "module" };
export const browserGlobals = {};
export const nodeGlobals = { process: "readonly", __dirname: "readonly", __filename: "readonly", Buffer: "readonly" };
export const testDomGlobals = {};
export const baseRules = {};
`,
);

console.log("Shared tooling shim created at", toolingBase);
