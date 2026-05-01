/**
 * Hex / RGB colour helpers.
 * @owner shared
 */

/**
 * @typedef {{ r: number, g: number, b: number, a: number }} Rgba
 */

/**
 * Parse `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa` into an RGBA object.
 *
 * @param {string} hex
 * @returns {Rgba | null}
 */
export function parseHex(hex) {
  if (typeof hex !== "string") return null;
  let s = hex.trim();
  if (s.startsWith("#")) s = s.slice(1);
  if (!/^[0-9a-f]+$/i.test(s)) return null;
  if (s.length === 3 || s.length === 4) {
    s = [...s].map((c) => c + c).join("");
  }
  if (s.length !== 6 && s.length !== 8) return null;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  const a = s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

/**
 * @param {Rgba | { r: number, g: number, b: number, a?: number }} rgba
 * @returns {string}
 */
export function toHex({ r, g, b, a = 1 }) {
  const channels = [r, g, b].map(clampByte).map(toPair).join("");
  if (a >= 1) return `#${channels}`;
  return `#${channels}${toPair(clampByte(Math.round(a * 255)))}`;
}

/**
 * Mix two colours by linear interpolation in RGB space.
 *
 * @param {string} a
 * @param {string} b
 * @param {number} t  0..1 fraction of `b`
 * @returns {string | null}
 */
export function mixHex(a, b, t) {
  const A = parseHex(a);
  const B = parseHex(b);
  if (!A || !B) return null;
  const k = Math.max(0, Math.min(1, t));
  return toHex({
    r: Math.round(A.r + (B.r - A.r) * k),
    g: Math.round(A.g + (B.g - A.g) * k),
    b: Math.round(A.b + (B.b - A.b) * k),
    a: A.a + (B.a - A.a) * k,
  });
}

/**
 * Relative luminance per WCAG; result in 0..1.
 *
 * @param {string} hex
 * @returns {number | null}
 */
export function luminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const norm = [rgb.r, rgb.g, rgb.b].map((v) => v / 255).map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
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
function toPair(n) {
  return n.toString(16).padStart(2, "0");
}
