/**
 * src/utils/locale-bootstrap.js — S135 locale scaffold helpers.
 *
 * Utilities for the "community pipeline" that turns a partial translation
 * map into a fully-keyed locale file (all keys from base locale present,
 * untranslated keys set to ""). This keeps parity checks passing while
 * community translators fill in remaining strings.
 */

/**
 * Merge `partial` translations over a `base` locale.
 * Keys present in base but absent from partial get `""` (empty scaffold).
 * Keys in partial but absent from base are silently dropped (forward-compat).
 *
 * @param {Record<string, string>} base    — source-of-truth locale (e.g. en)
 * @param {Record<string, string>} partial — community-supplied translations
 * @returns {Record<string, string>}
 */
export function createLocaleScaffold(base, partial) {
  /** @type {Record<string, string>} */ const out = {};
  for (const key of Object.keys(base ?? {})) {
    const val = (partial ?? {})[key];
    out[key] = typeof val === "string" && val.trim().length > 0 ? val : "";
  }
  return out;
}

/**
 * Report coverage: how many keys have a non-empty translation.
 * @param {Record<string, string>} locale
 * @returns {{ total: number, translated: number, missing: number, pct: number }}
 */
export function localeCoverage(locale) {
  const total = Object.keys(locale ?? {}).length;
  const translated = Object.values(locale ?? {}).filter(
    (v) => typeof v === "string" && v.trim().length > 0,
  ).length;
  const missing = total - translated;
  return { total, translated, missing, pct: total > 0 ? translated / total : 0 };
}

/**
 * Find keys that are empty in `locale` but have values in `reference`.
 * Returns them sorted alphabetically (useful for contributor dashboards).
 *
 * @param {Record<string, string>} locale
 * @param {Record<string, string>} reference
 * @returns {string[]}
 */
export function missingTranslations(locale, reference) {
  return Object.keys(reference ?? {})
    .filter((k) => {
      const v = (locale ?? {})[k];
      return typeof v !== "string" || v.trim().length === 0;
    })
    .sort();
}

/**
 * Validate that `locale` has every key from `reference`.
 * @param {Record<string, string>} locale
 * @param {Record<string, string>} reference
 * @returns {{ ok: boolean, extraKeys: string[], missingKeys: string[] }}
 */
export function validateLocaleShape(locale, reference) {
  const locKeys = new Set(Object.keys(locale ?? {}));
  const refKeys = new Set(Object.keys(reference ?? {}));
  const missingKeys = [...refKeys].filter((k) => !locKeys.has(k)).sort();
  const extraKeys = [...locKeys].filter((k) => !refKeys.has(k)).sort();
  return { ok: missingKeys.length === 0, missingKeys, extraKeys };
}
