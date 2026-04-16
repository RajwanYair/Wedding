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
 * Translate a key.
 * @param {string} key
 * @param {string} [fallback]
 * @returns {string}
 */
export function t(key, fallback) {
  return _dict[key] ?? fallback ?? key;
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
