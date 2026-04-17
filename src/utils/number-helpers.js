/**
 * src/utils/number-helpers.js — Numeric math & stats helpers (Sprint 180)
 *
 * Pure functions — no DOM, no side effects, no runtime dependencies.
 */

/**
 * Clamp a value between min and max (inclusive).
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round a number to a given number of decimal places.
 * @param {number} value
 * @param {number} [decimals=0]
 * @returns {number}
 */
export function roundTo(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Calculate the percentage that `part` represents of `total`.
 * Returns 0 when total is 0.
 * @param {number} part
 * @param {number} total
 * @param {number} [decimals=1]
 * @returns {number}
 */
export function toPercent(part, total, decimals = 1) {
  if (!total) return 0;
  return roundTo((part / total) * 100, decimals);
}

/**
 * Parse a string to a number, returning `fallback` on failure.
 * @param {string|unknown} str
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function parseNumber(str, fallback = 0) {
  const n = Number(String(str ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Return true when value is a safe integer.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isInteger(value) {
  return Number.isInteger(value);
}

/**
 * Sum an array of objects by a numeric field.
 * @template {Record<string, unknown>} T
 * @param {T[]} arr
 * @param {keyof T} field
 * @returns {number}
 */
export function sumBy(arr, field) {
  return arr.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
}

/**
 * Average an array of objects by a numeric field.
 * Returns 0 for empty arrays.
 * @template {Record<string, unknown>} T
 * @param {T[]} arr
 * @param {keyof T} field
 * @returns {number}
 */
export function avgBy(arr, field) {
  if (!arr.length) return 0;
  return sumBy(arr, field) / arr.length;
}

/**
 * Return the minimum value of a numeric field across an array.
 * Returns Infinity for empty arrays.
 * @template {Record<string, unknown>} T
 * @param {T[]} arr
 * @param {keyof T} field
 * @returns {number}
 */
export function minBy(arr, field) {
  if (!arr.length) return Infinity;
  return Math.min(...arr.map((item) => Number(item[field]) || 0));
}

/**
 * Return the maximum value of a numeric field across an array.
 * Returns -Infinity for empty arrays.
 * @template {Record<string, unknown>} T
 * @param {T[]} arr
 * @param {keyof T} field
 * @returns {number}
 */
export function maxBy(arr, field) {
  if (!arr.length) return -Infinity;
  return Math.max(...arr.map((item) => Number(item[field]) || 0));
}

/**
 * Linear interpolation between start and end.
 * @param {number} start
 * @param {number} end
 * @param {number} t  Value between 0 and 1
 * @returns {number}
 */
export function lerp(start, end, t) {
  return start + (end - start) * clamp(t, 0, 1);
}
