/**
 * src/utils/locale-detector.js — Sprint 143
 *
 * Browser language / locale detection with RTL support.
 * Fully injectable for testing (no direct navigator access).
 */

/** @type {Set<string>} ISO 639-1 RTL language codes */
const RTL_LANGS = new Set(["ar", "he", "fa", "ur", "yi", "dv", "ps", "sd", "ug"]);

/**
 * Extract the primary language subtag from a BCP-47 tag (e.g. "en-US" → "en").
 * @param {string} tag
 * @returns {string}
 */
export function primaryLang(tag) {
  return tag.split(/[-_]/)[0].toLowerCase();
}

/**
 * Determine if a locale is RTL.
 * @param {string} locale
 * @returns {boolean}
 */
export function isRtl(locale) {
  return RTL_LANGS.has(primaryLang(locale));
}

/**
 * Detect the user's preferred locale.
 * @param {{ languages?: readonly string[], language?: string }} [nav]
 *   Injectable navigator-like object (defaults to `globalThis.navigator`).
 * @returns {string} Best-guess locale string (e.g. "he", "en-US")
 */
export function detectLocale(nav) {
  const n = nav ?? globalThis.navigator ?? {};
  const langs = n.languages ?? (n.language ? [n.language] : []);
  return langs[0] ?? "en";
}

/**
 * Map a detected locale to one of the app's supported i18n keys.
 * @param {string} locale
 * @param {string[]} [supported]   Default: ["he","en","ar","ru"]
 * @param {string}  [fallback]     Default: "en"
 * @returns {string}
 */
export function resolveAppLocale(locale, supported = ["he", "en", "ar", "ru"], fallback = "en") {
  const lang = primaryLang(locale);
  return supported.includes(lang) ? lang : fallback;
}

/**
 * Full locale info object.
 * @param {{ languages?: readonly string[], language?: string }} [nav]
 * @returns {{ raw: string, primary: string, isRtl: boolean, appLocale: string }}
 */
export function getLocaleInfo(nav) {
  const raw       = detectLocale(nav);
  const primary   = primaryLang(raw);
  const rtl       = isRtl(raw);
  const appLocale = resolveAppLocale(raw);
  return { raw, primary, isRtl: rtl, appLocale };
}

// ── Currency mapping ───────────────────────────────────────────────────────

/**
 * Map from BCP-47 primary language subtag to ISO 4217 currency code.
 * Covers the app's four supported locales plus common Western currencies.
 * @type {Readonly<Record<string, string>>}
 */
const _LOCALE_CURRENCY = Object.freeze({
  he: "ILS", // Hebrew → Israeli New Shekel
  ar: "ILS", // Arabic (Israel) → ILS; override per region if needed
  ru: "RUB", // Russian → Russian Ruble (common default)
  en: "USD", // English → US Dollar
  de: "EUR",
  fr: "EUR",
  es: "EUR",
  it: "EUR",
  pt: "EUR",
  nl: "EUR",
  pl: "PLN",
  tr: "TRY",
  ja: "JPY",
  ko: "KRW",
  zh: "CNY",
  uk: "UAH",
  cs: "CZK",
  hu: "HUF",
  ro: "RON",
  sv: "SEK",
  no: "NOK",
  da: "DKK",
});

/**
 * Return the most likely ISO 4217 currency code for a given locale.
 * Strips region subtag and looks up primary language; falls back to "ILS"
 * (the app's home currency).
 *
 * @param {string} [locale] BCP-47 locale string (e.g. "he", "en-US", "ru-RU")
 * @returns {string} ISO 4217 currency code (e.g. "ILS", "USD", "EUR")
 */
export function getLocaleCurrency(locale) {
  const lang = primaryLang(locale ?? "");
  return _LOCALE_CURRENCY[lang] ?? "ILS";
}
