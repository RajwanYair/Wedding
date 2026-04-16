/**
 * src/core/i18n.js — Internationalisation (S0 named-export module)
 *
 * Lightweight i18n layer. Hebrew is pre-loaded eagerly; English is lazy-imported.
 * Uses Vite dynamic import() so both locales are bundled into dist/ — no runtime fetch.
 * No window.* side effects — consumers import `t()` and `applyI18n()`.
 */

/** @type {Record<string, string>} */
let _dict = {};
/** @type {'he'|'en'|'ar'|'ru'} */
let _lang = "he";

/**
 * Load a language pack via Vite dynamic import().
 * Hebrew is bundled eagerly; other locales are split into lazy chunks.
 *
 * @param {'he'|'en'|'ar'|'ru'} lang
 * @param {Record<string, string>} [_inlineDict]  Injected dict for unit tests only
 * @returns {Promise<void>}
 */
export async function loadLocale(lang, _inlineDict) {
  _lang = lang;
  // Unit-test escape hatch: allow inline dict injection without hitting the file system
  if (_inlineDict) {
    _dict = _inlineDict;
    return;
  }
  if (lang === "en") {
    const { default: dict } = await import("../i18n/en.json");
    _dict = dict;
  } else if (lang === "ar") {
    const { default: dict } = await import("../i18n/ar.json");
    _dict = dict;
  } else if (lang === "ru") {
    const { default: dict } = await import("../i18n/ru.json");
    _dict = dict;
  } else {
    // Hebrew — bundled eagerly into the main entry chunk
    const { default: dict } = await import("../i18n/he.json");
    _dict = dict;
  }
}

/**
 * Translate a key, with optional ICU MessageFormat interpolation.
 *
 * Supports:
 *  - Simple interpolation: `"Hello, {name}"` with `{ name: "Yair" }`
 *  - ICU plural: `"{count, plural, one {# guest} other {# guests}}"` with `{ count: 5 }`
 *  - Exact matches: `"{n, plural, =0 {none} one {# item} other {# items}}"`
 *
 * Backward-compatible: `t(key)` and `t(key, "fallback")` still work.
 *
 * @param {string} key
 * @param {Record<string, string|number> | string} [paramsOrFallback]
 * @param {string} [fallback]
 * @returns {string}
 */
export function t(key, paramsOrFallback, fallback) {
  const isParams = paramsOrFallback !== null && typeof paramsOrFallback === "object";
  const fb = isParams ? fallback : /** @type {string|undefined} */ (paramsOrFallback);
  const template = _dict[key] ?? fb ?? key;
  return isParams ? formatMessage(template, paramsOrFallback) : template;
}

// ── ICU MessageFormat (lightweight) ─────────────────────────────────────

/**
 * Resolve a lightweight ICU MessageFormat string.
 *
 * Handles `{key}` simple interpolation and
 * `{key, plural, =N {…} one {…} few {…} many {…} other {…}}` plural blocks.
 * Uses native `Intl.PluralRules` for locale-correct plural categories
 * (important for Arabic few/many and Russian one/few/many).
 *
 * @param {string} template
 * @param {Record<string, string|number>} params
 * @returns {string}
 */
export function formatMessage(template, params) {
  if (!template || !params) return template ?? "";

  // Parse top-level {…} blocks, handling nested braces for ICU plural syntax
  let result = "";
  let i = 0;
  while (i < template.length) {
    if (template[i] === "{") {
      // Find matching closing brace at depth 0
      let depth = 1;
      let j = i + 1;
      while (j < template.length && depth > 0) {
        if (template[j] === "{") depth++;
        else if (template[j] === "}") depth--;
        j++;
      }
      const inner = template.slice(i + 1, j - 1).trim();

      if (inner.includes(", plural,")) {
        result += _resolvePlural(inner, params);
      } else if (inner in params) {
        result += String(params[inner]);
      } else {
        result += template.slice(i, j); // leave unresolved tokens as-is
      }
      i = j;
    } else {
      result += template[i];
      i++;
    }
  }
  return result;
}

/**
 * Resolve an ICU plural expression.
 * @param {string} expr  e.g. `count, plural, =0 {none} one {# guest} other {# guests}`
 * @param {Record<string, string|number>} params
 * @returns {string}
 */
function _resolvePlural(expr, params) {
  const commaIdx = expr.indexOf(",");
  const varName = expr.slice(0, commaIdx).trim();
  const value = Number(params[varName] ?? 0);

  // Extract rules: `=N {text}`, `category {text}`
  const ruleStr = expr.slice(expr.indexOf(", plural,") + 9);
  /** @type {Record<string, string>} */
  const rules = {};
  const ruleRE = /(=\d+|\w+)\s*\{([^}]*)\}/g;
  let m;
  while ((m = ruleRE.exec(ruleStr)) !== null) {
    rules[m[1]] = m[2];
  }

  // 1. Exact match first: =0, =1, =5 …
  const exact = rules[`=${value}`];
  if (exact !== undefined) return exact.replace(/#/g, String(value));

  // 2. Intl.PluralRules category
  const category = _pluralRules().select(value); // "zero"|"one"|"two"|"few"|"many"|"other"
  const chosen = rules[category] ?? rules.other ?? "";
  return chosen.replace(/#/g, String(value));
}

/** @type {Intl.PluralRules | null} */
let _cachedRules = null;
/** @type {string} */
let _cachedRulesLang = "";

/** Get or create a cached PluralRules for the current locale. */
function _pluralRules() {
  const loc = _locale();
  if (_cachedRules && _cachedRulesLang === loc) return _cachedRules;
  _cachedRulesLang = loc;
  _cachedRules = new Intl.PluralRules(loc);
  return _cachedRules;
}

/**
 * Current active language.
 * @returns {'he'|'en'|'ar'|'ru'}
 */
export function currentLang() {
  return _lang;
}

/**
 * Apply translations to all elements with `data-i18n` attributes.
 * @param {Document | Element} [root]
 */
export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = /** @type {HTMLElement} */ (el).dataset.i18n;
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = /** @type {HTMLInputElement} */ (el).dataset.i18nPlaceholder;
    if (key) /** @type {HTMLInputElement} */ (el).placeholder = t(key);
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = /** @type {HTMLElement} */ (el).dataset.i18nTitle;
    if (key) /** @type {HTMLElement} */ (el).title = t(key);
  });
}

// ── F3.2.4 / F3.2.5 — Intl formatting helpers ──────────────────────────

/** Locale string matching current language */
function _locale() {
  const map = { he: "he-IL", en: "en-IL", ar: "ar-IL", ru: "ru-IL" };
  return map[_lang] ?? "he-IL";
}

/**
 * Format a date string or Date using Intl.DateTimeFormat, respecting current locale.
 * @param {string | Date | number} value  ISO string, Date, or timestamp
 * @param {Intl.DateTimeFormatOptions} [opts]
 * @returns {string}
 */
export function formatDate(value, opts) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  /** @type {Intl.DateTimeFormatOptions} */
  const defaults = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Jerusalem",
  };
  return new Intl.DateTimeFormat(_locale(), { ...defaults, ...opts }).format(d);
}

/**
 * Format a number using Intl.NumberFormat, respecting current locale.
 * @param {number} value
 * @param {Intl.NumberFormatOptions} [opts]
 * @returns {string}
 */
export function formatNumber(value, opts) {
  return new Intl.NumberFormat(_locale(), opts).format(value);
}

/**
 * Format a number as currency (ILS by default).
 * @param {number} value
 * @param {string} [currency]
 * @returns {string}
 */
export function formatCurrency(value, currency = "ILS") {
  return new Intl.NumberFormat(_locale(), { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}
