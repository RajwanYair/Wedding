/**
 * src/utils/phone.js — Phone number utilities (S0 named-export module)
 *
 * Converts Israeli phone numbers to international wa.me-ready format.
 * Named exports only — no window.* side effects.
 * @owner sections
 */

/**
 * Clean and normalise a phone number to international E.164 format.
 * Israeli 05X numbers → +9725XXXXXXXX (without leading +).
 *
 * @param {string} raw  Raw phone input from user
 * @returns {string}    Normalised digits string (digits only, no +)
 */
export function cleanPhone(raw) {
  let p = String(raw ?? "").replace(/[\s\-().]/g, "");
  if (!p) return "";
  if (p.startsWith("0")) p = `972${p.slice(1)}`;
  if (!p.startsWith("972") && !p.startsWith("+")) p = `972${p}`;
  return p.replace(/^\+/, "");
}

/**
 * Validate a cleaned phone number.
 * @param {string} phone  Already cleaned (cleanPhone output)
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  return /^[0-9]{9,15}$/.test(phone);
}
