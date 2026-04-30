/**
 * Deterministic URL shortener — converts long URLs to fixed-length opaque
 * tokens via a stable hash. Pure; no network. Tokens can be reversed by a
 * caller-supplied lookup table (the function only generates the token).
 */

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * 32-bit FNV-1a hash.
 *
 * @param {string} input
 * @returns {number}
 */
export function fnv1a(input) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Encode a non-negative integer in base-62 (URL-safe, case-sensitive).
 *
 * @param {number} n
 * @returns {string}
 */
export function toBase62(n) {
  if (!Number.isFinite(n) || n < 0) {
    throw new RangeError("n must be a non-negative finite number");
  }
  if (n === 0) return "0";
  let out = "";
  let v = Math.floor(n);
  while (v > 0) {
    out = ALPHABET[v % 62] + out;
    v = Math.floor(v / 62);
  }
  return out;
}

/**
 * Build a short token (default length 7) from a URL. Result is stable for
 * the same input. The token is padded with leading "0" to reach the target
 * length but never truncated below the natural hash size.
 *
 * @param {string} url
 * @param {{ length?: number, salt?: string }} [options]
 * @returns {string}
 */
export function shortToken(url, options = {}) {
  if (typeof url !== "string" || url.length === 0) {
    throw new TypeError("url must be a non-empty string");
  }
  const length = Number.isFinite(options.length) && options.length > 0 ? Math.floor(options.length) : 7;
  const salt = typeof options.salt === "string" ? options.salt : "";
  const hash = fnv1a(`${salt}|${url}`);
  const base = toBase62(hash);
  if (base.length >= length) return base;
  return "0".repeat(length - base.length) + base;
}

/**
 * Build a `https://host/<token>` short URL.
 *
 * @param {string} url
 * @param {string} host    e.g. "wed.short"
 * @param {{ length?: number, salt?: string }} [options]
 * @returns {string}
 */
export function shortUrl(url, host, options) {
  if (typeof host !== "string" || host.length === 0) {
    throw new TypeError("host must be a non-empty string");
  }
  const cleanHost = host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${cleanHost}/${shortToken(url, options)}`;
}
