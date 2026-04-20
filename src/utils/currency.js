/**
 * @module currency
 * @description Currency formatting and parsing utilities.
 * Primary currency: ILS (₪) with Israel locale.
 * Also supports USD and EUR. All functions are pure (no DOM, no network).
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Supported currency codes. */
export const SUPPORTED_CURRENCIES = /** @type {const} */ (['ILS', 'USD', 'EUR', 'GBP']);

/** Default locale per currency. */
const CURRENCY_LOCALE = {
  ILS: 'he-IL',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Format a numeric amount as a localised currency string.
 *
 * @param {number} amount - The numeric value to format.
 * @param {string} [currency='ILS'] - ISO 4217 currency code.
 * @param {string} [locale] - BCP-47 locale tag; defaults to currency's native locale.
 * @returns {string} Formatted currency string, e.g. "₪1,234.56".
 */
export function formatCurrency(amount, currency = 'ILS', locale) {
  if (typeof amount !== 'number' || !isFinite(amount)) return '';
  const resolvedLocale = locale ?? CURRENCY_LOCALE[currency] ?? 'en-US';
  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return String(amount);
  }
}

/**
 * Format an amount as a compact currency string (no fraction digits for whole numbers).
 *
 * @param {number} amount
 * @param {string} [currency='ILS']
 * @param {string} [locale]
 * @returns {string}
 */
export function formatCurrencyCompact(amount, currency = 'ILS', locale) {
  if (typeof amount !== 'number' || !isFinite(amount)) return '';
  const resolvedLocale = locale ?? CURRENCY_LOCALE[currency] ?? 'en-US';
  const fractions = Number.isInteger(amount) ? 0 : 2;
  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractions,
      maximumFractionDigits: fractions,
    }).format(amount);
  } catch {
    return String(amount);
  }
}

/**
 * Format a plain number with thousand separators (no currency symbol).
 *
 * @param {number} amount
 * @param {number} [decimals=2]
 * @param {string} [locale='he-IL']
 * @returns {string}
 */
export function formatNumber(amount, decimals = 2, locale = 'he-IL') {
  if (typeof amount !== 'number' || !isFinite(amount)) return '';
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    return String(amount);
  }
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parse a currency input string entered by the user into a plain number.
 * Strips currency symbols, thousand separators (`,` and `.` used as thousands),
 * and normalises decimal separator.
 *
 * Strategy:
 *  1. Remove all non-numeric characters except digits, `.`, `,` and `-`.
 *  2. If both `.` and `,` are present, decide which is the decimal separator:
 *     - If the last separator is `.` and there is exactly one `.`: decimal is `.`.
 *     - Otherwise: the last `,` is likely the decimal separator (European style).
 *  3. Return the resulting float, or NaN when the string is unparseable.
 *
 * @param {string} input
 * @returns {number} Parsed float or NaN.
 */
export function parseCurrencyInput(input) {
  if (typeof input !== 'string') return NaN;

  // Strip whitespace and common currency symbols
  let cleaned = input.replace(/[\s₪$€£]/g, '');
  if (!cleaned) return NaN;

  // Handle negative sign
  const negative = cleaned.startsWith('-');
  if (negative) cleaned = cleaned.slice(1);

  const dotIdx = cleaned.lastIndexOf('.');
  const commaIdx = cleaned.lastIndexOf(',');

  let normalised;

  if (dotIdx !== -1 && commaIdx !== -1) {
    // Both separators present — the last one is the decimal separator
    if (dotIdx > commaIdx) {
      // e.g. "1,234.56" — dot is decimal
      normalised = cleaned.replace(/,/g, '');
    } else {
      // e.g. "1.234,56" — comma is decimal
      normalised = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (commaIdx !== -1) {
    // Only comma — treat as decimal if after last 3 digits, else thousand sep
    const afterComma = cleaned.slice(commaIdx + 1);
    if (afterComma.length === 3 && !afterComma.includes('.')) {
      // Likely thousand separator: "1,234"
      normalised = cleaned.replace(/,/g, '');
    } else {
      // Decimal comma: "1234,56"
      normalised = cleaned.replace(',', '.');
    }
  } else {
    normalised = cleaned;
  }

  const result = parseFloat(normalised);
  return isNaN(result) ? NaN : (negative ? -result : result);
}

// ─── Arithmetic helpers ───────────────────────────────────────────────────────

/**
 * Add two currency amounts with controlled rounding to avoid floating-point drift.
 * Rounds to `precision` decimal places (default 2).
 *
 * @param {number} a
 * @param {number} b
 * @param {number} [precision=2]
 * @returns {number}
 */
export function addCurrency(a, b, precision = 2) {
  const factor = 10 ** precision;
  return Math.round((a + b) * factor) / factor;
}

/**
 * Subtract `b` from `a` with controlled rounding.
 *
 * @param {number} a
 * @param {number} b
 * @param {number} [precision=2]
 * @returns {number}
 */
export function subtractCurrency(a, b, precision = 2) {
  const factor = 10 ** precision;
  return Math.round((a - b) * factor) / factor;
}

/**
 * Calculate a percentage of an amount, rounded to `precision` decimal places.
 *
 * @param {number} amount
 * @param {number} percent - e.g. 17.5 for 17.5%
 * @param {number} [precision=2]
 * @returns {number}
 */
export function percentOf(amount, percent, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(amount * (percent / 100) * factor) / factor;
}

/**
 * Convert an amount from one currency to another using a provided exchange rate.
 *
 * @param {number} amount
 * @param {number} rate - Units of target currency per 1 unit of source currency.
 * @param {number} [precision=2]
 * @returns {number}
 */
export function convertCurrency(amount, rate, precision = 2) {
  if (!isFinite(amount) || !isFinite(rate) || rate === 0) return NaN;
  const factor = 10 ** precision;
  return Math.round(amount * rate * factor) / factor;
}
