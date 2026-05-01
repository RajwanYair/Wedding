/**
 * Cookie helpers — parse a `document.cookie` header into an object and
 * serialize back to a single `Set-Cookie` value.  Pure functions; no
 * direct `document` access so the helpers run in Workers and tests.
 * @owner shared
 */

/**
 * Parse a cookie header string into an object.  Later occurrences of the
 * same key win.  Values are URI-decoded.
 *
 * @param {string} header
 * @returns {Record<string, string>}
 */
export function parseCookies(header) {
  if (typeof header !== "string" || header.length === 0) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k.length === 0) continue;
    let v = part.slice(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

/**
 * @typedef {object} CookieOptions
 * @property {string} [path]
 * @property {string} [domain]
 * @property {Date | string | number} [expires]
 * @property {number} [maxAge] seconds
 * @property {boolean} [secure]
 * @property {boolean} [httpOnly]
 * @property {"Strict" | "Lax" | "None"} [sameSite]
 */

/**
 * Serialize a key / value pair plus options into a `Set-Cookie` value.
 * Throws on invalid name characters.
 *
 * @param {string} name
 * @param {string} value
 * @param {CookieOptions} [opts]
 * @returns {string}
 */
export function serializeCookie(name, value, opts = {}) {
  if (typeof name !== "string" || !/^[\w!#$%&'*+\-.^`|~]+$/.test(name)) {
    throw new TypeError("serializeCookie: invalid cookie name");
  }
  const parts = [`${name}=${encodeURIComponent(String(value))}`];
  if (opts.maxAge !== undefined) {
    if (!Number.isFinite(opts.maxAge)) {
      throw new RangeError("serializeCookie: maxAge must be finite");
    }
    parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  }
  if (opts.expires !== undefined) {
    const d =
      opts.expires instanceof Date ? opts.expires : new Date(opts.expires);
    if (Number.isNaN(d.getTime())) {
      throw new RangeError("serializeCookie: invalid expires");
    }
    parts.push(`Expires=${d.toUTCString()}`);
  }
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.secure) parts.push("Secure");
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join("; ");
}
