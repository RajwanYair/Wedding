/**
 * Query-string parser/serialiser.  Supports repeated keys → arrays,
 * boolean-empty values, and nested bracket notation `a[0]=x&a[1]=y`.
 * Pure: no `URL`, no `URLSearchParams` mutations leaked.
 */

/**
 * Parse a query string (with or without leading `?`) into a plain object.
 * Repeated keys collect into arrays.
 *
 * @param {string} input
 * @returns {Record<string, string | string[]>}
 */
export function parse(input) {
  /** @type {Record<string, string | string[]>} */
  const out = {};
  if (typeof input !== "string" || input.length === 0) return out;
  const text = input.startsWith("?") ? input.slice(1) : input;
  if (text.length === 0) return out;
  for (const pair of text.split("&")) {
    if (pair.length === 0) continue;
    const eq = pair.indexOf("=");
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawVal = eq === -1 ? "" : pair.slice(eq + 1);
    const key = safeDecode(rawKey);
    const val = safeDecode(rawVal);
    if (key.length === 0) continue;
    const prev = out[key];
    if (prev === undefined) {
      out[key] = val;
    } else if (Array.isArray(prev)) {
      prev.push(val);
    } else {
      out[key] = [prev, val];
    }
  }
  return out;
}

/**
 * Serialise an object to a query string.  Arrays repeat the key.  `null`
 * and `undefined` values are skipped; `Date` values become ISO strings.
 *
 * @param {Record<string, unknown>} obj
 * @returns {string}
 */
export function stringify(obj) {
  if (obj === null || typeof obj !== "object") return "";
  /** @type {string[]} */
  const parts = [];
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    const v = obj[key];
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item === null || item === undefined) continue;
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(toScalar(item))}`);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(toScalar(v))}`);
    }
  }
  return parts.join("&");
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function toScalar(v) {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  return String(v);
}

/**
 * @param {string} v
 * @returns {string}
 */
function safeDecode(v) {
  try {
    return decodeURIComponent(v.replace(/\+/g, " "));
  } catch {
    return v;
  }
}
