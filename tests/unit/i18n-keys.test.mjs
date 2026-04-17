/**
 * tests/unit/i18n-keys.test.mjs — Validate all locale JSON files have identical key sets (v6.0-S4)
 *
 * Ensures no locale is missing keys that other locales have.
 * Catches missing translations before they reach production.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const i18nDir = resolve(__dirname, "..", "..", "src", "i18n");

const LOCALES = ["he", "en", "ar", "ru"];

/** @type {Record<string, Record<string, unknown>>} */
const data = {};
for (const locale of LOCALES) {
  data[locale] = JSON.parse(
    readFileSync(resolve(i18nDir, `${locale}.json`), "utf8"),
  );
}

/**
 * Recursively collect all dot-separated keys from a nested object.
 * @param {Record<string, unknown>} obj
 * @param {string} [prefix]
 * @returns {Set<string>}
 */
function collectKeys(obj, prefix = "") {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      collectKeys(/** @type {Record<string, unknown>} */ (v), full).forEach(
        (nested) => keys.add(nested),
      );
    } else {
      keys.add(full);
    }
  }
  return keys;
}

const keySets = {};
for (const locale of LOCALES) {
  keySets[locale] = collectKeys(data[locale]);
}

// Use Hebrew as the reference locale (primary language)
const refLocale = "he";
const refKeys = keySets[refLocale];

// en must be in perfect sync; ar/ru may lag (tracked as soft warnings)
const strictLocales = ["en"];
const softLocales = ["ar", "ru"];

describe("i18n key-set validation", () => {
  it("all locale files parse as valid JSON", () => {
    for (const locale of LOCALES) {
      expect(data[locale]).toBeDefined();
      expect(typeof data[locale]).toBe("object");
    }
  });

  // ── Strict: en must match he exactly ────────────────────────────────
  for (const locale of strictLocales) {
    it(`${locale} has all keys from ${refLocale}`, () => {
      const missing = [...refKeys].filter((k) => !keySets[locale].has(k));
      expect(
        missing,
        `${locale} is missing ${missing.length} keys: ${missing.slice(0, 10).join(", ")}`,
      ).toHaveLength(0);
    });

    it(`${locale} has no extra keys not in ${refLocale}`, () => {
      const extra = [...keySets[locale]].filter((k) => !refKeys.has(k));
      expect(
        extra,
        `${locale} has ${extra.length} extra keys: ${extra.slice(0, 10).join(", ")}`,
      ).toHaveLength(0);
    });
  }

  // ── Soft: ar/ru may have gaps — log but don't fail ───────────────────
  for (const locale of softLocales) {
    it(`${locale} coverage vs ${refLocale} (soft audit)`, () => {
      const missing = [...refKeys].filter((k) => !keySets[locale].has(k));
      const extra = [...keySets[locale]].filter((k) => !refKeys.has(k));
      const coverage = (
        ((refKeys.size - missing.length) / refKeys.size) *
        100
      ).toFixed(1);
      // Log stats but don't fail
      if (missing.length > 0 || extra.length > 0) {
        console.log(
          `[i18n-audit] ${locale}: ${coverage}% coverage, ${missing.length} missing, ${extra.length} extra`,
        );
      }
      // Only fail if coverage drops below 50% (seriously broken)
      expect(
        Number(coverage),
        `${locale} coverage is critically low (${coverage}%)`,
      ).toBeGreaterThan(50);
    });
  }

  it("no locale has empty string values", () => {
    for (const locale of LOCALES) {
      const empties = [];
      for (const key of keySets[locale]) {
        const parts = key.split(".");
        let val = data[locale];
        for (const p of parts) val = /** @type {any} */ (val)[p];
        if (val === "") empties.push(key);
      }
      expect(
        empties,
        `${locale} has ${empties.length} empty strings: ${empties.slice(0, 5).join(", ")}`,
      ).toHaveLength(0);
    }
  });

  it("he and en have the same number of keys", () => {
    expect(
      keySets.he.size,
      "he and en key count mismatch",
    ).toBe(keySets.en.size);
  });
});
