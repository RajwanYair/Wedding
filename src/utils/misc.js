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
