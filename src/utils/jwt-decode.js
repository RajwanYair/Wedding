/**
 * Lightweight JWT decoder — splits header/payload/signature and decodes
 * base64url to JSON.  **Does not verify signatures.**  Use only for
 * reading non-sensitive claims (exp, sub) on tokens we already trust
 * (e.g. Supabase session tokens already validated by the SDK).
 * @owner shared
 */

/**
 * @param {string} token
 * @returns {{
 *   header: Record<string, unknown>,
 *   payload: Record<string, unknown>,
 *   signature: string,
 * }}
 */
export function decodeJwt(token) {
  if (typeof token !== "string") {
    throw new TypeError("decodeJwt: expected string");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new SyntaxError("decodeJwt: expected 3 dot-separated segments");
  }
  const [h, p, s] = parts;
  return {
    header: parseSegment(h, "header"),
    payload: parseSegment(p, "payload"),
    signature: s,
  };
}

/**
 * Decode the payload only.
 * @param {string} token
 * @returns {Record<string, unknown>}
 */
export function decodeJwtPayload(token) {
  return decodeJwt(token).payload;
}

/**
 * @param {string} token
 * @param {{ now?: number, leewaySec?: number }} [opts]
 * @returns {boolean}
 */
export function isJwtExpired(token, opts = {}) {
  const { exp } = decodeJwtPayload(token);
  if (typeof exp !== "number") return false;
  const now = opts.now ?? Date.now() / 1000;
  const leeway = opts.leewaySec ?? 0;
  return now > exp + leeway;
}

/**
 * @param {string} seg
 * @param {string} label
 * @returns {Record<string, unknown>}
 */
function parseSegment(seg, label) {
  let json;
  try {
    json = base64UrlDecode(seg);
  } catch {
    throw new SyntaxError(`decodeJwt: invalid base64url in ${label}`);
  }
  try {
    return JSON.parse(json);
  } catch {
    throw new SyntaxError(`decodeJwt: invalid JSON in ${label}`);
  }
}

/**
 * @param {string} input
 * @returns {string}
 */
function base64UrlDecode(input) {
  const pad = input.length % 4 === 0 ? 0 : 4 - (input.length % 4);
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  if (typeof atob === "function") {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
  // Node fallback (tests run under happy-dom which exposes atob).
  /* c8 ignore next */
  throw new Error("base64UrlDecode: atob unavailable");
}
