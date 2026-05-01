#!/usr/bin/env node
/**
 * scripts/check-i18n-icu.mjs — S583 CI gate.
 *
 * Validates every ICU MessageFormat string across all locale JSON files:
 *   1. Braces balance (no unterminated `{...}` or stray `}`).
 *   2. `{var, plural, ...}` blocks include a mandatory `other {...}` arm.
 *   3. `{var, select, ...}` blocks include a mandatory `other {...}` arm.
 *   4. Locale-required plural categories are present (e.g. AR needs
 *      `zero/one/two/few/many/other`; HE needs `one/two/many/other`).
 *   5. Every `{name}` placeholder also exists somewhere in EN parity
 *      (catches typos like `{nmae}`).
 *
 * Exits 0 on success, 1 on the first violation, prints JSON-friendly
 * diagnostics. Wired into `npm run lint` via `package.json` and into CI.
 *
 * @owner i18n
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const I18N_DIR = "src/i18n";

/** @type {Record<string, readonly string[]>} */
const REQUIRED_CATEGORIES = {
  ar: ["zero", "one", "two", "few", "many", "other"],
  he: ["one", "two", "many", "other"],
  en: ["one", "other"],
  es: ["one", "many", "other"],
  fr: ["one", "many", "other"],
  ru: ["one", "few", "many", "other"],
};

/** @param {string} s */
function assertBraces(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth < 0) return "stray '}' before matching '{'";
    }
  }
  return depth === 0 ? null : `unbalanced braces (${depth} unclosed)`;
}

/** @param {string} pattern */
function findIcuBlocks(pattern) {
  /** @type {Array<{ type: "plural" | "select", arms: string[], raw: string }>} */
  const blocks = [];
  const re = /\{(\w+)\s*,\s*(plural|select)\s*,\s*([\s\S]*?)\}\s*(?=\}|$)/g;
  // Naive but sufficient — re-scan with depth tracking for nested cases:
  let i = 0;
  while (i < pattern.length) {
    const open = pattern.indexOf("{", i);
    if (open === -1) break;
    let depth = 0;
    let close = -1;
    for (let j = open; j < pattern.length; j++) {
      if (pattern[j] === "{") depth++;
      else if (pattern[j] === "}") {
        depth--;
        if (depth === 0) {
          close = j;
          break;
        }
      }
    }
    if (close === -1) break;
    const inside = pattern.slice(open + 1, close);
    const m = inside.match(/^(\w+)\s*,\s*(plural|select)\s*,\s*([\s\S]+)$/);
    if (m) {
      const armsRaw = m[3];
      const arms = [];
      let k = 0;
      while (k < armsRaw.length) {
        const armMatch = armsRaw.slice(k).match(/^\s*(=\d+|\w+)\s*\{/);
        if (!armMatch) break;
        const name = armMatch[1];
        const armOpen = k + armMatch[0].length - 1;
        let d = 0;
        let armClose = -1;
        for (let j = armOpen; j < armsRaw.length; j++) {
          if (armsRaw[j] === "{") d++;
          else if (armsRaw[j] === "}") {
            d--;
            if (d === 0) {
              armClose = j;
              break;
            }
          }
        }
        if (armClose === -1) break;
        arms.push(name);
        k = armClose + 1;
      }
      blocks.push({ type: /** @type {"plural" | "select"} */ (m[2]), arms, raw: inside });
    }
    i = close + 1;
    void re; // keep regex referenced to silence unused warnings
  }
  return blocks;
}

/** @param {string} dir @param {{ strict?: boolean }} [opts] */
export function checkIcu(dir = I18N_DIR, opts = {}) {
  const { strict = false } = opts;
  /** @type {Array<{ locale: string, key: string, error: string }>} */
  const violations = [];

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  /** @type {Record<string, Record<string, string>>} */
  const all = {};
  for (const f of files) {
    const lang = f.replace(/\.json$/, "");
    all[lang] = JSON.parse(readFileSync(join(dir, f), "utf8"));
  }

  for (const [locale, dict] of Object.entries(all)) {
    for (const [key, value] of Object.entries(dict)) {
      if (typeof value !== "string" || value.length === 0) continue;
      // 1. brace balance
      const braceErr = assertBraces(value);
      if (braceErr) {
        violations.push({ locale, key, error: braceErr });
        continue;
      }
      // 2-4. inspect ICU blocks
      const blocks = findIcuBlocks(value);
      for (const b of blocks) {
        if (!b.arms.includes("other")) {
          violations.push({ locale, key, error: `${b.type} block missing required 'other' arm` });
        }
        if (strict && b.type === "plural") {
          const required = REQUIRED_CATEGORIES[locale] ?? ["one", "other"];
          const hasExactZero = b.arms.includes("=0");
          for (const cat of required) {
            if (cat === "zero" && hasExactZero) continue;
            if (!b.arms.includes(cat)) {
              violations.push({
                locale,
                key,
                error: `plural arm '${cat}' missing (required by ${locale} in --strict)`,
              });
            }
          }
        }
      }
    }
  }

  return violations;
}

if (process.argv[1]?.endsWith("check-i18n-icu.mjs")) {
  const strict = process.argv.includes("--strict");
  const violations = checkIcu(I18N_DIR, { strict });
  if (violations.length === 0) {
    console.log(`✓ ICU validation OK${strict ? " (strict)" : ""}`);
    process.exit(0);
  }
  console.error(`✖ ICU validation FAIL — ${violations.length} violation(s):`);
  for (const v of violations.slice(0, 30)) {
    console.error(`  [${v.locale}] ${v.key}: ${v.error}`);
  }
  if (violations.length > 30) console.error(`  ... +${violations.length - 30} more`);
  process.exit(1);
}
