/**
 * src/utils/locale-format.js — Locale-aware formatting utilities
 *
 * S54: Wraps Intl APIs (DateTimeFormat, RelativeTimeFormat, ListFormat,
 * PluralRules, Collator) with sensible Hebrew/English defaults and helpers
 * for the wedding app's display layer.
 *
 * All functions accept an optional `locale` parameter (defaults to "he-IL").
 */

// ── Constants ──────────────────────────────────────────────────────────────

export const DEFAULT_LOCALE = "he-IL";
export const FALLBACK_LOCALE = "en-US";

// ── Date / Time ────────────────────────────────────────────────────────────

/**
 * Formats a Date (or ISO string / timestamp) as a short date.
 * e.g. "15.8.2025" in he-IL, "8/15/2025" in en-US.
 * @param {Date | string | number} value
 * @param {string} [locale]
 * @returns {string}
 */
export function formatShortDate(value, locale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

/**
 * Formats a Date as a long human-readable date.
 * e.g. "יום שישי, 15 באוגוסט 2025" in he-IL.
 * @param {Date | string | number} value
 * @param {string} [locale]
 * @returns {string}
 */
export function formatLongDate(value, locale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

/**
 * Formats a Date as time only (HH:MM).
 * @param {Date | string | number} value
 * @param {string} [locale]
 * @returns {string}
 */
export function formatTime(value, locale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

/**
 * Formats a Date as date + time.
 * @param {Date | string | number} value
 * @param {string} [locale]
 * @returns {string}
 */
export function formatDateTime(value, locale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

/**
 * Returns the full month name for a given month index (0-based).
 * @param {number} monthIndex 0–11
 * @param {string} [locale]
 * @returns {string}
 */
export function getMonthName(monthIndex, locale = DEFAULT_LOCALE) {
  const d = new Date(2000, monthIndex, 1);
  return new Intl.DateTimeFormat(locale, { month: "long" }).format(d);
}

/**
 * Returns all 12 month names for the given locale.
 * @param {string} [locale]
 * @returns {string[]}
 */
export function getMonthNames(locale = DEFAULT_LOCALE) {
  return Array.from({ length: 12 }, (_, i) => getMonthName(i, locale));
}

/**
 * Returns the abbreviated weekday name for a Date.
 * @param {Date | string | number} value
 * @param {string} [locale]
 * @returns {string}
 */
export function getWeekdayShort(value, locale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(value));
}

// ── Relative Time ──────────────────────────────────────────────────────────

/**
 * @typedef {"year"|"quarter"|"month"|"week"|"day"|"hour"|"minute"|"second"} RelUnit
 */

/**
 * Formats a relative time value.
 * @param {number} value  Positive = future, negative = past
 * @param {RelUnit} unit
 * @param {string} [locale]
 * @returns {string}
 */
export function formatRelativeTime(value, unit, locale = DEFAULT_LOCALE) {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
}

/**
 * Returns a human-readable relative description from a timestamp to now.
 * Picks the most appropriate unit automatically.
 * @param {Date | string | number} value
 * @param {string} [locale]
 * @returns {string}
 */
export function formatTimeAgo(value, locale = DEFAULT_LOCALE) {
  const diffMs = new Date(value).getTime() - Date.now();
  const absDiff = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absDiff < 60_000) return rtf.format(Math.round(diffMs / 1_000), "second");
  if (absDiff < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (absDiff < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  if (absDiff < 2_592_000_000) return rtf.format(Math.round(diffMs / 86_400_000), "day");
  if (absDiff < 31_536_000_000) return rtf.format(Math.round(diffMs / 2_592_000_000), "month");
  return rtf.format(Math.round(diffMs / 31_536_000_000), "year");
}

// ── List Format ────────────────────────────────────────────────────────────

/**
 * Formats an array of strings as a natural-language list.
 * e.g. ["Alice", "Bob", "Carol"] → "Alice, Bob ו-Carol" (he-IL)
 * @param {string[]} items
 * @param {"conjunction"|"disjunction"|"unit"} [type]
 * @param {string} [locale]
 * @returns {string}
 */
export function formatList(items, type = "conjunction", locale = DEFAULT_LOCALE) {
  if (items.length === 0) return "";
  return new Intl.ListFormat(locale, { style: "long", type }).format(items);
}

/**
 * Formats an array of strings as a short/narrow unit list.
 * @param {string[]} items
 * @param {string} [locale]
 * @returns {string}
 */
export function formatListNarrow(items, locale = DEFAULT_LOCALE) {
  if (items.length === 0) return "";
  return new Intl.ListFormat(locale, { style: "narrow", type: "unit" }).format(items);
}

// ── Plural Rules ───────────────────────────────────────────────────────────

/**
 * Returns the plural category for a number.
 * @param {number} n
 * @param {"cardinal"|"ordinal"} [type]
 * @param {string} [locale]
 * @returns {"zero"|"one"|"two"|"few"|"many"|"other"}
 */
export function getPluralCategory(n, type = "cardinal", locale = DEFAULT_LOCALE) {
  return /** @type {any} */ (new Intl.PluralRules(locale, { type }).select(n));
}

/**
 * Selects the correct plural form from a map.
 * @param {number} n
 * @param {{ zero?: string; one?: string; two?: string; few?: string; many?: string; other: string }} forms
 * @param {string} [locale]
 * @returns {string}
 */
export function pluralize(n, forms, locale = DEFAULT_LOCALE) {
  const cat = getPluralCategory(n, "cardinal", locale);
  return forms[cat] ?? forms.other;
}

// ── Collator / Sorting ─────────────────────────────────────────────────────

/**
 * Returns a locale-aware sort comparator function.
 * @param {string} [locale]
 * @param {Intl.CollatorOptions} [opts]
 * @returns {(a: string, b: string) => number}
 */
export function getCollator(locale = DEFAULT_LOCALE, opts = {}) {
  const collator = new Intl.Collator(locale, { sensitivity: "base", ...opts });
  return (a, b) => collator.compare(a, b);
}

/**
 * Sorts an array of strings locale-aware (mutates and returns).
 * @param {string[]} arr
 * @param {string} [locale]
 * @returns {string[]}
 */
export function sortLocale(arr, locale = DEFAULT_LOCALE) {
  return arr.sort(getCollator(locale));
}

/**
 * Sorts an array of objects by a string key locale-aware.
 * @template {Record<string, unknown>} T
 * @param {T[]} arr
 * @param {keyof T} key
 * @param {string} [locale]
 * @returns {T[]}
 */
export function sortByKey(arr, key, locale = DEFAULT_LOCALE) {
  const cmp = getCollator(locale);
  return arr.sort((a, b) => cmp(String(a[key] ?? ""), String(b[key] ?? "")));
}

// ── Number / Percent helpers ───────────────────────────────────────────────

/**
 * Formats a number with locale-aware grouping and optional decimal places.
 * @param {number} n
 * @param {{ minimumFractionDigits?: number; maximumFractionDigits?: number }} [opts]
 * @param {string} [locale]
 * @returns {string}
 */
export function formatLocaleNumber(n, opts = {}, locale = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: opts.minimumFractionDigits ?? 0,
    maximumFractionDigits: opts.maximumFractionDigits ?? 2,
  }).format(n);
}

/**
 * Formats a 0–1 ratio as a percentage string.
 * @param {number} ratio
 * @param {number} [decimals]
 * @param {string} [locale]
 * @returns {string}
 */
export function formatPercent(ratio, decimals = 0, locale = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(ratio);
}
