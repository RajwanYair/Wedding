/**
 * RFC-4122 v4 UUID generator and validator.  Uses the platform CSPRNG
 * (`crypto.getRandomValues`); falls back to `Math.random` only when no
 * crypto is available so the function is always callable.  Production
 * code in browsers always hits the CSPRNG path.
 * @owner shared
 */

const HEX = "0123456789abcdef";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generate a v4 UUID string.
 *
 * @returns {string}
 */
export function uuid() {
  /** @type {Uint8Array} */
  const buf = new Uint8Array(16);
  fillRandom(buf);
  // Per RFC 4122 §4.4: set version (4) and variant (10) bits.
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  let out = "";
  for (let i = 0; i < 16; i += 1) {
    if (i === 4 || i === 6 || i === 8 || i === 10) out += "-";
    out += HEX[(buf[i] >> 4) & 0x0f] + HEX[buf[i] & 0x0f];
  }
  return out;
}

/**
 * Type-narrowing UUID v4 check.  Accepts uppercase or lowercase hex.
 *
 * @param {unknown} value
 * @returns {value is string}
 */
export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * @param {Uint8Array} buf
 */
function fillRandom(buf) {
  /** @type {{ getRandomValues?: (buf: Uint8Array) => Uint8Array }} */
  const c = /** @type {any} */ (globalThis).crypto;
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(buf);
    return;
  }
  for (let i = 0; i < buf.length; i += 1) {
    buf[i] = Math.floor(Math.random() * 256);
  }
}
