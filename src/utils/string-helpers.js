/**
 * src/utils/string-helpers.js — String utility functions (Sprint 165)
 *
 * Pure string helpers used across display, search, and export logic.
 * Zero dependencies.
 */

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to title case (capitalize each word).
 * @param {string} str
 * @returns {string}
 */
export function toTitleCase(str) {
  return str.replace(/\S+/g, (word) => capitalize(word));
}

/**
 * Truncate a string to a max length, appending an ellipsis if truncated.
 * @param {string} str
 * @param {number} max
 * @param {string} [ellipsis]
 * @returns {string}
 */
export function truncate(str, max, ellipsis = "…") {
  if (str.length <= max) return str;
  return str.slice(0, max) + ellipsis;
}

/**
 * Slugify a string: lowercase, replace spaces with hyphens, strip non-alphanumeric.
 * @param {string} str
 * @returns {string}
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Pad a number or string to a minimum length.
 * @param {string | number} val
 * @param {number} length
 * @param {string} [pad]
 * @returns {string}
 */
export function padStart(val, length, pad = "0") {
  return String(val).padStart(length, pad);
}

/**
 * Count occurrences of a substring inside a string.
 * @param {string} haystack
 * @param {string} needle
 * @returns {number}
 */
export function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

/**
 * Check if a string is blank (null, undefined, empty, or only whitespace).
 * @param {unknown} val
 * @returns {boolean}
 */
export function isBlank(val) {
  return val == null || String(val).trim() === "";
}

/**
 * Normalize Hebrew / Arabic / Latin diacritics for fuzzy search.
 * Strips combining marks and normalizes to NFC.
 * @param {string} str
 * @returns {string}
 */
export function normalizeForSearch(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip Latin diacritics
    .toLowerCase()
    .trim();
}

/**
 * Escape special characters for use in a regex pattern.
 * @param {string} str
 * @returns {string}
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Simple template interpolation: replace {{key}} placeholders.
 * @param {string} template
 * @param {Record<string, unknown>} vars
 * @returns {string}
 */
export function interpolate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return key in vars ? String(vars[key]) : `{{${key}}}`;
  });
}

/**
 * Format a number with thousand separators.
 * @param {number} num
 * @param {string} [locale]
 * @returns {string}
 */
export function formatNumber(num, locale = "he-IL") {
  return num.toLocaleString(locale);
}
