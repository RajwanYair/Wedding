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

/** RTL languages */
const RTL_LANGS = new Set(["he", "ar"]);
const BILINGUAL_LANGS = new Set(["he", "en"]);

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
    _applyDirection(lang);
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
  _applyDirection(lang);
}

/**
 * Set `dir` and `lang` attributes on the document root.
 * RTL for he/ar, LTR for en/ru.
 * @param {'he'|'en'|'ar'|'ru'} lang
 */
function _applyDirection(lang) {
  if (typeof document === "undefined") return;
  const dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
}

/**
 * Preload a secondary locale into the module cache during idle time.
 * Does NOT switch the active language — just primes the dynamic import.
 * @param {'he'|'en'|'ar'|'ru'} lang
 */
export function preloadLocale(lang) {
  const loader = () => {
    if (lang === "en") import("../i18n/en.json");
    else if (lang === "ar") import("../i18n/ar.json");
    else if (lang === "ru") import("../i18n/ru.json");
    // he is bundled eagerly — no preload needed
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(loader, { timeout: 5000 });
  } else {
    setTimeout(loader, 3000);
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
  // Check plugin i18n overrides first, then main dict
  const pluginDict = /** @type {any} */ (globalThis).__pluginI18n?.[_lang];
  const template = _dict[key] ?? pluginDict?.[key] ?? fb ?? key;
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
 * Normalize the app UI language to the supported bilingual pair.
 * @param {string | null | undefined} lang
 * @returns {'he'|'en'}
 */
export function normalizeUiLanguage(lang) {
  return lang === "en" ? "en" : "he";
}

/**
 * Get the next language in the Hebrew/English toggle.
 * @param {string | null | undefined} [lang]
 * @returns {'he'|'en'}
 */
export function nextUiLanguage(lang = _lang) {
  return normalizeUiLanguage(lang) === "he" ? "en" : "he";
}

/**
 * Label shown on the language toggle button.
 * @param {string | null | undefined} [lang]
 * @returns {string}
 */
export function languageToggleLabel(lang = _lang) {
  return normalizeUiLanguage(lang) === "he" ? "EN" : "עב";
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
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = /** @type {HTMLElement} */ (el).dataset.i18nAria;
    if (key) /** @type {HTMLElement} */ (el).setAttribute("aria-label", t(key));
  });
  root.querySelectorAll("[data-i18n-tooltip]").forEach((el) => {
    const key = /** @type {HTMLElement} */ (el).dataset.i18nTooltip;
    if (key) /** @type {HTMLElement} */ (el).title = t(key);
  });
  root.querySelectorAll("[data-lang-toggle-label]").forEach((el) => {
    if (!BILINGUAL_LANGS.has(normalizeUiLanguage(_lang))) return;
    el.textContent = languageToggleLabel(_lang);
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

/**
 * Format a list of strings using Intl.ListFormat (S22a).
 * e.g. ["Alice", "Bob", "Carla"] → "Alice, Bob, and Carla" (en) / "Alice, Bob, ו-Carla" (he)
 * @param {string[]} items
 * @param {"conjunction"|"disjunction"|"unit"} [type]
 * @returns {string}
 */
export function formatList(items, type = "conjunction") {
  if (items.length === 0) return "";
  const lf = new Intl.ListFormat(_locale(), { style: "long", type });
  return lf.format(items);
}

/**
 * Format a number using Intl.PluralRules (S22a) — returns the plural category.
 * Useful for a11y text: "1 אורח" vs "2 אורחים".
 * @param {number} count
 * @returns {"zero"|"one"|"two"|"few"|"many"|"other"}
 */
export function pluralCategory(count) {
  const pr = new Intl.PluralRules(_locale());
  return /** @type {"zero"|"one"|"two"|"few"|"many"|"other"} */ (pr.select(count));
}

// ── S22b — RTL helpers (explicit per-locale) ─────────────────────────────

/**
 * Whether the current locale uses right-to-left text direction.
 * Explicit: `he` and `ar` are RTL; `en` and `ru` are LTR.
 * @returns {boolean}
 */
export function isRTL() {
  return RTL_LANGS.has(_lang);
}

/**
 * The logical text direction for the current locale.
 * @returns {'rtl' | 'ltr'}
 */
export function textDir() {
  return isRTL() ? "rtl" : "ltr";
}
