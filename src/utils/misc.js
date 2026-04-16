/**
 * src/utils/misc.js — Miscellaneous helpers (S0 named-export module)
 */

/**
 * Generate a short unique ID using Date.now + random base-36.
 * @returns {string}
 */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Return a guest's display name.
 * @param {{ firstName?: string, lastName?: string }} g
 * @returns {string}
 */
export function guestFullName(g) {
  return (g.firstName ?? "") + (g.lastName ? ` ${g.lastName}` : "");
}

/**
 * Parse a gift string as a numeric amount (NIS).
 * Strips ₪/NIS prefix/suffix and commas; returns 0 for non-numeric values.
 * @param {string|*} raw
 * @returns {number}
 */
export function parseGiftAmount(raw) {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[₪,\s]/g, "").replace(/^NIS/i, "").replace(/NIS$/i, "");
  const n = parseFloat(cleaned);
  return isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Validate that a string is either empty/nullish or a valid HTTPS URL.
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export function isValidHttpsUrl(url) {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch (_e) {
    return false;
  }
}
