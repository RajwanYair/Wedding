/**
 * Color helpers — hex / RGB / HSL conversion and contrast checks.
 * Used for theme variant generation and accessibility checks.
 * @owner shared
 */

/**
 * @param {string} hex
 * @returns {{r:number,g:number,b:number,a:number} | null}
 */
export function parseHex(hex) {
  if (typeof hex !== "string") return null;
  let s = hex.trim().replace(/^#/, "");
  if (s.length === 3 || s.length === 4) {
    s = s.split("").map((c) => c + c).join("");
  }
  if (s.length !== 6 && s.length !== 8) return null;
  if (!/^[0-9a-fA-F]+$/.test(s)) return null;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  const a = s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

/**
 * @param {number} r 0..255
 * @param {number} g 0..255
 * @param {number} b 0..255
 * @param {number} [a] 0..1
 */
export function toHex(r, g, b, a) {
  const h = (n) => clampByte(n).toString(16).padStart(2, "0");
  let out = `#${h(r)}${h(g)}${h(b)}`;
  if (a !== undefined && a < 1) {
    out += Math.round(clamp01(a) * 255)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {{h:number,s:number,l:number}}
 */
export function rgbToHsl(r, g, b) {
  const rn = clampByte(r) / 255;
  const gn = clampByte(g) / 255;
  const bn = clampByte(b) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}

/**
 * @param {number} h 0..360
 * @param {number} s 0..1
 * @param {number} l 0..1
 * @returns {{r:number,g:number,b:number}}
 */
export function hslToRgb(h, s, l) {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = clamp01(s);
  const ll = clamp01(l);
  /** @param {number} p @param {number} q @param {number} t */
  const f = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (ss === 0) {
    const v = Math.round(ll * 255);
    return { r: v, g: v, b: v };
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  return {
    r: Math.round(f(p, q, hh + 1 / 3) * 255),
    g: Math.round(f(p, q, hh) * 255),
    b: Math.round(f(p, q, hh - 1 / 3) * 255),
  };
}

/**
 * Relative luminance per WCAG 2.x.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function luminance(r, g, b) {
  const lin = (c) => {
    const v = clampByte(c) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * WCAG contrast ratio (1..21) given two RGB triples.
 * @param {{r:number,g:number,b:number}} a
 * @param {{r:number,g:number,b:number}} b
 */
export function contrastRatio(a, b) {
  const la = luminance(a.r, a.g, a.b);
  const lb = luminance(b.r, b.g, b.b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Lighten or darken an RGB color by an amount in HSL lightness space.
 * @param {{r:number,g:number,b:number}} rgb
 * @param {number} amount -1..1
 */
export function adjustLightness(rgb, amount) {
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return hslToRgb(h, s, clamp01(l + amount));
}

/**
 * @param {number} n
 */
function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}
/**
 * @param {number} n
 */
function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}
