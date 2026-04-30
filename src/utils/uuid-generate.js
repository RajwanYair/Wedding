/**
 * RFC 4122 v4 UUID generator backed by `crypto.getRandomValues`.
 * Pure browser-safe; no Node Buffer.
 */

const HEX = "0123456789abcdef";

/**
 * Generate a v4 UUID.
 *
 * @returns {string}
 */
export function uuidV4() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

/**
 * Format a 16-byte buffer as a canonical UUID string.
 *
 * @param {Uint8Array | ArrayLike<number>} bytes
 * @returns {string}
 */
export function formatUuid(bytes) {
  if (!bytes || bytes.length !== 16) {
    throw new Error("uuid: expected 16 bytes");
  }
  let out = "";
  for (let i = 0; i < 16; i += 1) {
    const b = bytes[i] & 0xff;
    out += HEX[b >> 4] + HEX[b & 0x0f];
    if (i === 3 || i === 5 || i === 7 || i === 9) out += "-";
  }
  return out;
}

/**
 * Validate canonical UUID string (any version/variant).
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

/**
 * Validate that a string is specifically a v4 UUID with RFC variant.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isUuidV4(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
