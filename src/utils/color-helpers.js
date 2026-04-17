/**
 * src/utils/color-helpers.js — Color utility functions (Sprint 197)
 *
 * Pure functions: no side effects, no imports.
 */

/**
 * Parse a CSS hex color string to an {r,g,b} object.
 * Supports 3-char (#abc) and 6-char (#aabbcc) formats.
 * Returns null for invalid input.
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number } | null}
 */
export function hexToRgb(hex) {
  if (typeof hex !== "string") return null;
  const clean = hex.replace(/^#/, "");
  let r, g, b;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  } else {
    return null;
  }
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

/**
 * Convert r,g,b channel values (0–255) to a lowercase hex color string.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}  e.g. "#1a2b3c"
 */
export function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const hex = [clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

/**
 * Lighten a hex color by a factor (0–1).
 * @param {string} hex
 * @param {number} factor  0 = no change, 1 = white
 * @returns {string}
 */
export function lighten(hex, factor) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = Math.max(0, Math.min(1, factor));
  return rgbToHex(
    rgb.r + (255 - rgb.r) * f,
    rgb.g + (255 - rgb.g) * f,
    rgb.b + (255 - rgb.b) * f
  );
}

/**
 * Darken a hex color by a factor (0–1).
 * @param {string} hex
 * @param {number} factor  0 = no change, 1 = black
 * @returns {string}
 */
export function darken(hex, factor) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = Math.max(0, Math.min(1, factor));
  return rgbToHex(rgb.r * (1 - f), rgb.g * (1 - f), rgb.b * (1 - f));
}

/**
 * Return "#000000" or "#ffffff" depending on which has better contrast
 * against the given background hex color (WCAG relative luminance).
 * @param {string} hex
 * @returns {"#000000" | "#ffffff"}
 */
export function getContrastColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#000000";
  // sRGB linearization
  const toLinear = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const L =
    0.2126 * toLinear(rgb.r) +
    0.7152 * toLinear(rgb.g) +
    0.0722 * toLinear(rgb.b);
  return L > 0.179 ? "#000000" : "#ffffff";
}

/**
 * Blend two hex colors by weight (0 = all color1, 1 = all color2).
 * @param {string} hex1
 * @param {string} hex2
 * @param {number} weight  0–1
 * @returns {string}
 */
export function blendColors(hex1, hex2, weight) {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  if (!a || !b) return hex1;
  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex(
    a.r + (b.r - a.r) * w,
    a.g + (b.g - a.g) * w,
    a.b + (b.b - a.b) * w
  );
}
