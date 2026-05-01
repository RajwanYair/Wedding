/**
 * Minimal HTML entity encode / decode for plain text export and import.
 * Covers the five XML predefined entities plus numeric `&#nn;` /
 * `&#xnn;` decode and a small set of frequently-used named entities.
 *
 * For full HTML5 entity support use the platform's `DOMParser`; this
 * helper is for environments where a DOM is unavailable (Workers,
 * sheets export pipelines).
 * @owner shared
 */

const NAMED_DECODE = /** @type {Record<string, string>} */ ({
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
});

/**
 * Encode the five XML predefined entities (`& < > " '`).  Other
 * characters are passed through untouched.
 * @param {string} input
 * @returns {string}
 */
export function escapeHtml(input) {
  if (typeof input !== "string") return "";
  return input.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/**
 * Decode named, decimal, and hex HTML entities.  Unknown named entities
 * are passed through verbatim.
 * @param {string} input
 * @returns {string}
 */
export function unescapeHtml(input) {
  if (typeof input !== "string") return "";
  return input.replace(/&(#x?[0-9a-f]+|[a-z0-9]+);/gi, (match, body) => {
    if (body[0] === "#") {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    const lower = body.toLowerCase();
    return NAMED_DECODE[lower] ?? match;
  });
}
