/**
 * URL-safe slug generator.  Lower-cases, strips diacritics, replaces
 * non-alphanumerics with the separator, collapses runs, and trims.
 * Hebrew and other non-Latin scripts are kept by default; pass
 * `latinize: true` to drop them entirely.
 */

/**
 * @param {string} input
 * @param {{
 *   separator?: string,
 *   maxLength?: number,
 *   latinize?: boolean,
 *   lower?: boolean,
 * }} [opts]
 * @returns {string}
 */
export function slugify(input, opts = {}) {
  if (typeof input !== "string") return "";
  const sep = opts.separator ?? "-";
  const lower = opts.lower !== false;
  const maxLength = opts.maxLength ?? 0;
  // Normalise + strip diacritics.
  let s = input.normalize("NFKD").replace(/\p{M}+/gu, "");
  if (opts.latinize) s = s.replace(/[^A-Za-z0-9\s_-]+/g, "");
  if (lower) s = s.toLowerCase();
  // Replace runs of disallowed chars with the separator.  We accept
  // letters, digits, and underscores; everything else collapses.
  s = s.replace(/[^\p{L}\p{N}_]+/gu, sep);
  // Trim leading/trailing separators.
  if (sep.length > 0) {
    const sepRe = new RegExp(
      `^(?:${escape(sep)})+|(?:${escape(sep)})+$`,
      "g",
    );
    s = s.replace(sepRe, "");
  }
  if (maxLength > 0 && s.length > maxLength) s = s.slice(0, maxLength);
  if (sep.length > 0 && s.endsWith(sep)) s = s.slice(0, -sep.length);
  return s;
}

/**
 * @param {string} re
 */
function escape(re) {
  return re.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
