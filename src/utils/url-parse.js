/**
 * URL parsing helpers built on the platform `URL` API, with safer
 * predicates that don't throw and a few wedding-specific shortcuts.
 * @owner shared
 */

/**
 * Safe URL parse — returns `null` instead of throwing.
 * @param {unknown} input
 * @param {string} [base]
 * @returns {URL | null}
 */
export function parseUrl(input, base) {
  if (typeof input !== "string" || input.length === 0) return null;
  try {
    return new URL(input, base);
  } catch {
    return null;
  }
}

/**
 * @param {unknown} input
 * @param {{ protocols?: string[] }} [opts]
 * @returns {boolean}
 */
export function isUrl(input, opts = {}) {
  const u = parseUrl(input);
  if (!u) return false;
  if (opts.protocols && opts.protocols.length > 0) {
    return opts.protocols.includes(u.protocol.replace(/:$/, ""));
  }
  return true;
}

/**
 * @param {unknown} input
 * @returns {boolean}
 */
export function isHttpUrl(input) {
  return isUrl(input, { protocols: ["http", "https"] });
}

/**
 * Parse query string into a plain object.  Repeated keys collapse into an
 * array; falsy / non-string input yields `{}`.
 * @param {string} qs
 * @returns {Record<string, string | string[]>}
 */
export function parseQuery(qs) {
  if (typeof qs !== "string" || qs.length === 0) return {};
  const trimmed = qs.startsWith("?") ? qs.slice(1) : qs;
  /** @type {Record<string, string | string[]>} */
  const out = {};
  const params = new URLSearchParams(trimmed);
  for (const [k, v] of params) {
    if (k in out) {
      const cur = out[k];
      out[k] = Array.isArray(cur) ? [...cur, v] : [cur, v];
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Build a query string (no leading `?`) from a flat object.  `undefined`
 * / `null` values are skipped; arrays produce repeated keys.
 * @param {Record<string, unknown>} obj
 * @returns {string}
 */
export function buildQuery(obj) {
  if (!obj || typeof obj !== "object") return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item === undefined || item === null) continue;
        params.append(k, String(item));
      }
    } else {
      params.append(k, String(v));
    }
  }
  return params.toString();
}

/**
 * Append / overwrite query params on a URL string; returns updated URL
 * string or original input on parse failure.
 * @param {string} url
 * @param {Record<string, unknown>} params
 * @returns {string}
 */
export function withQuery(url, params) {
  const u = parseUrl(url);
  if (!u || !params) return url;
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) {
      u.searchParams.delete(k);
    } else if (Array.isArray(v)) {
      u.searchParams.delete(k);
      for (const item of v) {
        if (item !== undefined && item !== null) {
          u.searchParams.append(k, String(item));
        }
      }
    } else {
      u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
}
