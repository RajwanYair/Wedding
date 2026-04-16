/**
 * src/core/i18n.js — Internationalisation (S0 named-export module)
 *
 * Lightweight i18n layer. Hebrew is pre-loaded eagerly; English is lazy-imported.
 * Uses Vite dynamic import() so both locales are bundled into dist/ — no runtime fetch.
 * No window.* side effects — consumers import `t()` and `applyI18n()`.
 */

/** @type {Record<string, string>} */
let _dict = {};
/** @type {'he'|'en'} */
let _lang = "he";

/**
 * Load a language pack via Vite dynamic import().
 * Hebrew is bundled eagerly; English is split into the `locale-en` lazy chunk.
 *
 * @param {'he'|'en'} lang
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
    // Lazy-loaded English locale — Vite splits this into the `locale-en` chunk
    const { default: dict } = await import("../i18n/en.json");
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
 * @returns {'he'|'en'}
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
