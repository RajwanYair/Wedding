/**
 * IPv4 / IPv6 address parsing and validation helpers.  Pure JS, no DNS.
 * @owner shared
 */

/**
 * @param {unknown} v
 * @returns {boolean}
 */
export function isIPv4(v) {
  if (typeof v !== "string") return false;
  const parts = v.split(".");
  if (parts.length !== 4) return false;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return false;
    if (p.length > 1 && p.startsWith("0")) return false; // no leading zeros
    const n = Number(p);
    if (n < 0 || n > 255) return false;
  }
  return true;
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
export function isIPv6(v) {
  if (typeof v !== "string" || v.length === 0) return false;
  // Reject zone IDs for simplicity.
  if (v.includes("%")) return false;
  // Embedded IPv4 (e.g. ::ffff:1.2.3.4)
  let ipv4Tail = "";
  const lastColon = v.lastIndexOf(":");
  if (lastColon !== -1 && v.slice(lastColon + 1).includes(".")) {
    const tail = v.slice(lastColon + 1);
    if (!isIPv4(tail)) return false;
    ipv4Tail = tail;
    v = `${v.slice(0, lastColon + 1)}0:0`;
  }
  const dbl = v.split("::");
  if (dbl.length > 2) return false;
  /** @param {string} s */
  const groups = (s) => (s === "" ? [] : s.split(":"));
  const head = groups(dbl[0]);
  const tail = dbl.length === 2 ? groups(dbl[1]) : [];
  const total = head.length + tail.length;
  if (dbl.length === 2) {
    if (total > 8) return false;
  } else if (total !== 8) {
    return false;
  }
  for (const g of [...head, ...tail]) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return false;
  }
  void ipv4Tail;
  return true;
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
export function isIP(v) {
  return isIPv4(v) || isIPv6(v);
}

/**
 * Parse IPv4 dotted-quad to 32-bit unsigned integer; returns null on bad input.
 * @param {string} v
 * @returns {number | null}
 */
export function ipv4ToInt(v) {
  if (!isIPv4(v)) return null;
  const [a, b, c, d] = v.split(".").map(Number);
  return ((a * 256 + b) * 256 + c) * 256 + d;
}

/**
 * Format a 32-bit unsigned integer as dotted-quad IPv4.
 * @param {number} n
 * @returns {string}
 */
export function intToIPv4(n) {
  if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) {
    throw new RangeError("intToIPv4: out of range");
  }
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ].join(".");
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
export function isPrivateIPv4(v) {
  if (!isIPv4(/** @type {string} */ (v))) return false;
  const [a, b] = /** @type {string} */ (v).split(".").map(Number);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  return false;
}
