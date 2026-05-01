/**
 * FNV-1a 32-bit hash — a small non-cryptographic hash used for cache
 * keys, bloom-filter inputs, and sharding.  Not suitable for security
 * purposes; for crypto use Web Crypto.
 */

const FNV_OFFSET_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;

/**
 * Hash a string to a 32-bit unsigned integer.  Empty / non-string input
 * returns the FNV offset basis (0x811c9dc5).
 *
 * @param {string} input
 * @param {number} [seed]
 * @returns {number}
 */
export function fnv1a32(input, seed = FNV_OFFSET_32) {
  let h = seed >>> 0;
  if (typeof input !== "string") return h;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME_32);
  }
  return h >>> 0;
}

/**
 * Hex-formatted, zero-padded to 8 characters.
 * @param {string} input
 * @param {number} [seed]
 * @returns {string}
 */
export function fnv1a32Hex(input, seed) {
  return fnv1a32(input, seed).toString(16).padStart(8, "0");
}

/**
 * Hash bytes (Uint8Array) — useful for hashing binary blobs without
 * paying for `TextDecoder`.
 *
 * @param {Uint8Array} bytes
 * @param {number} [seed]
 * @returns {number}
 */
export function fnv1a32Bytes(bytes, seed = FNV_OFFSET_32) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("fnv1a32Bytes: expected Uint8Array");
  }
  let h = seed >>> 0;
  for (let i = 0; i < bytes.length; i += 1) {
    h ^= bytes[i];
    h = Math.imul(h, FNV_PRIME_32);
  }
  return h >>> 0;
}
