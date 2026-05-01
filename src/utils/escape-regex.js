/**
 * Escape a string for safe insertion into a `RegExp` source.  Escapes the
 * 12 ECMAScript regex metacharacters and `-` (so it is safe inside a
 * character class).  Non-string inputs return an empty string.
 * @owner shared
 */

const META = /[.*+?^${}()|[\]\\\-/]/g;

/**
 * @param {unknown} input
 * @returns {string}
 */
export function escapeRegex(input) {
  if (typeof input !== "string") return "";
  return input.replace(META, "\\$&");
}

/**
 * Build a `RegExp` matching the literal `needle` (case-insensitive by default).
 * @param {string} needle
 * @param {string} [flags]
 * @returns {RegExp}
 */
export function literalRegex(needle, flags = "i") {
  return new RegExp(escapeRegex(needle), flags);
}
