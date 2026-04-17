/**
 * src/utils/number-formatter.js — Number, currency, and size formatters (Sprint 108)
 *
 * Consistent locale-aware formatting for the wedding app.
 * All functions are pure — no DOM, no side effects.
 *
 * Locale: falls back to "he-IL" (Hebrew Israel) when omitted, matching the
 *         app's primary language.
 */

const DEFAULT_LOCALE = "he-IL";

// ── Currency ───────────────────────────────────────────────────────────────

/**
 * Format a numeric amount as currency.
 * @param {number}  amount
 * @param {string}  [currency="ILS"]
 * @param {string}  [locale]
 * @returns {string}
 * @example formatCurrency(3500) → "₪3,500.00"
 */
export function formatCurrency(amount, currency = "ILS", locale = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(locale, {
    style:                 "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Percentage ────────────────────────────────────────────────────────────

/**
 * Format a ratio (0–1) or percentage value as a readable percentage string.
 * @param {number}  value       0.75 → "75%" (ratio) when isRatio=true; 75 → "75%" otherwise
 * @param {number}  [decimals=0]
 * @param {boolean} [isRatio=true]
 * @param {string}  [locale]
 * @returns {string}
 */
export function formatPercent(value, decimals = 0, isRatio = true, locale = DEFAULT_LOCALE) {
  const normalised = isRatio ? value : value / 100;
  return new Intl.NumberFormat(locale, {
    style:                 "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(normalised);
}

// ── Count / unit ──────────────────────────────────────────────────────────

/**
 * Format an integer count with a unit label, pluralised for English.
 * @param {number}  n
 * @param {string}  unit   singular form, e.g. "guest"
 * @param {string}  [locale]
 * @returns {string}    e.g. "42 guests"
 */
export function formatCount(n, unit, locale = DEFAULT_LOCALE) {
  const formatted = new Intl.NumberFormat(locale).format(n);
  // Naive English plural — works for the most common cases in this app
  const plural = n === 1 ? unit : `${unit}s`;
  return `${formatted} ${plural}`;
}

// ── File size ─────────────────────────────────────────────────────────────

/**
 * Format a byte count as a human-readable file size.
 * @param {number} bytes
 * @returns {string}   e.g. "1.4 KB", "3.2 MB"
 */
export function formatFileSize(bytes) {
  if (bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  const decimals = idx === 0 ? 0 : 1;
  return `${val.toFixed(decimals)} ${units[idx]}`;
}

// ── Integer / compact ─────────────────────────────────────────────────────

/**
 * Format a large number compactly: 1500 → "1.5K", 1_200_000 → "1.2M".
 * @param {number}  n
 * @param {string}  [locale]
 * @returns {string}
 */
export function formatCompact(n, locale = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(locale, {
    notation:              "compact",
    compactDisplay:        "short",
    maximumFractionDigits: 1,
  }).format(n);
}

/**
 * Format a plain integer with locale-appropriate thousand separators.
 * @param {number} n
 * @param {string} [locale]
 * @returns {string}
 */
export function formatInteger(n, locale = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
}
