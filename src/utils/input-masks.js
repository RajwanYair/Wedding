/**
 * src/utils/input-masks.js — Input-mask formatting helpers (Sprint 207)
 *
 * Pure, stateless functions for formatting and parsing masked input values.
 * Covers phone numbers, dates, credit-card-style numbers, and custom patterns.
 *
 * Zero dependencies.
 */

/**
 * Format a phone number string for display.
 * Handles Israeli mobile (05x) and landlines.
 *
 * @param {string} raw    Raw digit string (may include +, -, spaces)
 * @param {{ international?: boolean }} [opts]
 * @returns {string}
 */
export function formatPhone(raw, opts = {}) {
  const digits = raw.replace(/\D/g, "");
  const { international = false } = opts;
  if (international) {
    if (digits.startsWith("972")) {
      const local = digits.slice(3);
      return `+972 ${local.slice(0, 2)}-${local.slice(2, 5)}-${local.slice(5)}`;
    }
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

/**
 * Format a date string as DD/MM/YYYY for display.
 * Accepts ISO strings, dashes, or slash-separated values.
 *
 * @param {string} raw   e.g. "2026-04-18" or "18042026"
 * @returns {string}
 */
export function formatDate(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) {
    // Could be DDMMYYYY or YYYYMMDD — check century
    const first4 = parseInt(digits.slice(0, 4), 10);
    if (first4 >= 1900 && first4 <= 2100) {
      // YYYYMMDD
      return `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
    }
    // DDMMYYYY
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }
  // Try ISO: YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return raw;
}

/**
 * Apply a mask pattern to a digit string.
 * Pattern characters:
 *   '#' = any digit
 *   any other char = literal separator
 *
 * @param {string} value   Input value (only digits kept)
 * @param {string} pattern e.g. "####-####-####"
 * @returns {string}
 */
export function applyMask(value, pattern) {
  const digits = value.replace(/\D/g, "");
  let out = "";
  let di = 0;
  for (let pi = 0; pi < pattern.length && di < digits.length; pi++) {
    if (pattern[pi] === "#") {
      out += digits[di++];
    } else {
      out += pattern[pi];
    }
  }
  return out;
}

/**
 * Strip a mask pattern from a formatted value, returning only digits.
 * @param {string} value
 * @returns {string}
 */
export function stripMask(value) {
  return value.replace(/\D/g, "");
}

/**
 * Format a number as a local currency string (ILS by default).
 * @param {number} amount
 * @param {string} [currency]
 * @param {string} [locale]
 * @returns {string}
 */
export function formatCurrency(amount, currency = "ILS", locale = "he-IL") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Validate that a value matches a pattern (same # syntax).
 * @param {string} value
 * @param {string} pattern
 * @returns {boolean}
 */
export function matchesMask(value, pattern) {
  const digits = value.replace(/\D/g, "");
  const required = (pattern.match(/#/g) ?? []).length;
  return digits.length === required;
}

/**
 * Progressively mask sensitive data for display (e.g., partial phone).
 * Shows last N chars, replaces rest with '*'.
 * @param {string} value
 * @param {number} [visible]  Number of visible trailing chars (default 4).
 * @returns {string}
 */
export function maskSensitive(value, visible = 4) {
  if (!value || value.length <= visible) return value;
  return "*".repeat(value.length - visible) + value.slice(-visible);
}
