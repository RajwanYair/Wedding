/**
 * Tiny color palette utility — hex ↔ HSL, lighten/darken, and complementary
 * palette generation.  No DOM, pure functions.
 *
 * @typedef {object} HSL
 * @property {number} h - 0..360
 * @property {number} s - 0..100
 * @property {number} l - 0..100
 * @owner shared
 */

/**
 * Parse a `#rgb` or `#rrggbb` string into HSL.
 *
 * @param {string} hex
 * @returns {HSL}
 */
export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rN:
        h = (gN - bN) / d + (gN < bN ? 6 : 0);
        break;
      case gN:
        h = (bN - rN) / d + 2;
        break;
      default:
        h = (rN - gN) / d + 4;
    }
    h *= 60;
  }
  return { h: round(h), s: round(s * 100), l: round(l * 100) };
}

/**
 * Convert an HSL value to a `#rrggbb` string.
 *
 * @param {HSL} hsl
 * @returns {string}
 */
export function hslToHex({ h, s, l }) {
  const sN = clamp(s, 0, 100) / 100;
  const lN = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = lN - c / 2;
  return rgbToHex(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  );
}

/**
 * @param {string} hex
 * @param {number} amount - 0..100 percentage points
 * @returns {string}
 */
export function lighten(hex, amount) {
  const hsl = hexToHsl(hex);
  return hslToHex({ h: hsl.h, s: hsl.s, l: clamp(hsl.l + amount, 0, 100) });
}

/**
 * @param {string} hex
 * @param {number} amount - 0..100 percentage points
 * @returns {string}
 */
export function darken(hex, amount) {
  const hsl = hexToHsl(hex);
  return hslToHex({ h: hsl.h, s: hsl.s, l: clamp(hsl.l - amount, 0, 100) });
}

/**
 * Generate a 5-stop palette around the seed hue.
 *
 * @param {string} seedHex
 * @returns {string[]}
 */
export function palette(seedHex) {
  const hsl = hexToHsl(seedHex);
  return [-30, -15, 0, 15, 30].map((delta) =>
    hslToHex({ h: hsl.h, s: hsl.s, l: clamp(hsl.l + delta, 5, 95) }),
  );
}

/**
 * @param {string} hex
 * @returns {{r: number, g: number, b: number}}
 */
function hexToRgb(hex) {
  if (typeof hex !== "string") throw new Error("hex: expected string");
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`hex: invalid color "${hex}"`);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
function rgbToHex(r, g, b) {
  const toHex = (/** @type {number} */ n) =>
    clamp(n, 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
function round(n) {
  return Math.round(n * 10) / 10;
}
