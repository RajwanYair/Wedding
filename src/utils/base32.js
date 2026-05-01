/**
 * RFC-4648 Base32 encoder/decoder with optional `=` padding.
 * Operates on `Uint8Array` ↔ string.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
/** @type {Record<string, number>} */
const LOOKUP = {};
for (let i = 0; i < ALPHABET.length; i += 1) LOOKUP[ALPHABET[i]] = i;

/**
 * Encode bytes to a base32 string.
 *
 * @param {Uint8Array | ArrayBuffer | ReadonlyArray<number>} bytes
 * @param {{ padding?: boolean }} [opts]
 * @returns {string}
 */
export function encodeBase32(bytes, opts = {}) {
  const padding = opts.padding ?? true;
  const buf =
    bytes instanceof Uint8Array
      ? bytes
      : new Uint8Array(/** @type {any} */ (bytes));
  let out = "";
  let bits = 0;
  let value = 0;
  for (let i = 0; i < buf.length; i += 1) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(value >>> bits) & 0x1f];
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 0x1f];
  if (padding) {
    while (out.length % 8 !== 0) out += "=";
  }
  return out;
}

/**
 * Decode a base32 string to bytes.  Returns `null` for invalid input.
 *
 * @param {string} input
 * @returns {Uint8Array | null}
 */
export function decodeBase32(input) {
  if (typeof input !== "string") return null;
  const s = input.replace(/=+$/, "").toUpperCase();
  if (s.length === 0) return new Uint8Array(0);
  /** @type {number[]} */
  const out = [];
  let bits = 0;
  let value = 0;
  for (let i = 0; i < s.length; i += 1) {
    const idx = LOOKUP[s[i]];
    if (idx === undefined) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}
