/**
 * WCAG 2.2 contrast ratio helpers.
 *
 * Implements the relative-luminance formula from WCAG 2.x §1.4.3.
 * Pure functions; no DOM access.
 * @owner shared
 */

/**
 * Parse a CSS hex colour (`#abc`, `#aabbcc`, `#aabbccff`) into 0–255 RGB.
 * Returns `null` for unparseable input.
 *
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number } | null}
 */
export function parseHex(hex) {
  if (typeof hex !== "string") return null;
  let s = hex.trim().replace(/^#/, "");
  if (s.length === 3 || s.length === 4) {
    s = s
      .slice(0, 3)
      .split("")
      .map((c) => c + c)
      .join("");
  } else if (s.length === 8) {
    s = s.slice(0, 6);
  } else if (s.length !== 6) {
    return null;
  }
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  };
}

/**
 * Compute relative luminance of an RGB triple (0–255 channels).
 *
 * @param {{ r: number, g: number, b: number }} rgb
 * @returns {number}
 */
export function relativeLuminance({ r, g, b }) {
  const channel = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Contrast ratio between two colours, expressed as e.g. `4.5` (i.e. 4.5:1).
 *
 * @param {string} fg Foreground hex.
 * @param {string} bg Background hex.
 * @returns {number}  Ratio (1..21). NaN if either colour fails to parse.
 */
export function contrastRatio(fg, bg) {
  const f = parseHex(fg);
  const b = parseHex(bg);
  if (!f || !b) return Number.NaN;
  const lf = relativeLuminance(f);
  const lb = relativeLuminance(b);
  const [hi, lo] = lf > lb ? [lf, lb] : [lb, lf];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * WCAG conformance level for a given ratio + text size.
 *
 * @param {number} ratio
 * @param {{ large?: boolean }} [opts]
 * @returns {"AAA" | "AA" | "FAIL"}
 */
export function wcagLevel(ratio, opts = {}) {
  if (!Number.isFinite(ratio)) return "FAIL";
  const aa = opts.large ? 3 : 4.5;
  const aaa = opts.large ? 4.5 : 7;
  if (ratio >= aaa) return "AAA";
  if (ratio >= aa) return "AA";
  return "FAIL";
}

/**
 * Convenience predicate for the AA threshold.
 *
 * @param {string} fg
 * @param {string} bg
 * @param {{ large?: boolean }} [opts]
 * @returns {boolean}
 */
export function passesAA(fg, bg, opts = {}) {
  return wcagLevel(contrastRatio(fg, bg), opts) !== "FAIL";
}
