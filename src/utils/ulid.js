/**
 * ULID — Universally Unique Lexicographically Sortable Identifier.
 * 26-character Crockford base32: 10 chars timestamp (ms) + 16 chars
 * randomness.  See https://github.com/ulid/spec.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/**
 * Generate a ULID for the given timestamp (defaults to now).
 *
 * @param {{ now?: () => number, random?: () => number }} [opts]
 * @returns {string}
 */
export function ulid(opts = {}) {
  const now = opts.now ?? Date.now;
  const rand = opts.random ?? defaultRandom;
  const ts = now();
  if (!Number.isFinite(ts) || ts < 0 || ts > 2 ** 48 - 1) {
    throw new RangeError("ulid: timestamp out of range");
  }
  return encodeTime(ts, 10) + encodeRandom(rand, 16);
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isUlid(value) {
  return typeof value === "string" && ULID_RE.test(value);
}

/**
 * Decode the millisecond timestamp portion of a ULID.
 *
 * @param {string} value
 * @returns {number | null}
 */
export function ulidTimestamp(value) {
  if (!isUlid(value)) return null;
  let ts = 0;
  for (let i = 0; i < 10; i += 1) {
    const idx = ALPHABET.indexOf(value[i]);
    if (idx < 0) return null;
    ts = ts * 32 + idx;
  }
  return ts;
}

/**
 * @param {number} time
 * @param {number} length
 */
function encodeTime(time, length) {
  let out = "";
  let n = Math.floor(time);
  for (let i = length - 1; i >= 0; i -= 1) {
    out = ALPHABET[n % 32] + out;
    n = Math.floor(n / 32);
  }
  return out;
}

/**
 * @param {() => number} rand
 * @param {number} length
 */
function encodeRandom(rand, length) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(rand() * 32) & 0x1f];
  }
  return out;
}

function defaultRandom() {
  /** @type {{ getRandomValues?: (buf: Uint8Array) => Uint8Array }} */
  const c = /** @type {any} */ (globalThis).crypto;
  if (c && typeof c.getRandomValues === "function") {
    const b = new Uint8Array(1);
    c.getRandomValues(b);
    return b[0] / 256;
  }
  return Math.random();
}

