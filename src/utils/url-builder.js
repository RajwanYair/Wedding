/**
 * Tiny URL builder — joins a base + path segments and appends a sorted
 * query string.  Skips null/undefined values; arrays expand via repeated
 * keys; encodes safely with `encodeURIComponent`.
 * @owner shared
 */

/**
 * @param {string} base
 * @param {{
 *   path?: ReadonlyArray<string | number> | string,
 *   query?: Record<string, unknown>,
 *   hash?: string,
 * }} [opts]
 * @returns {string}
 */
export function buildUrl(base, opts = {}) {
  const root = String(base).replace(/\/+$/, "");
  const path = joinPath(opts.path);
  const qs = buildQuery(opts.query);
  const hash = opts.hash ? `#${encodeURI(opts.hash)}` : "";
  return `${root}${path}${qs}${hash}`;
}

/**
 * @param {ReadonlyArray<string | number> | string | undefined} input
 */
function joinPath(input) {
  if (input == null) return "";
  /** @type {ReadonlyArray<string | number>} */
  const parts = Array.isArray(input)
    ? input
    : String(input).split("/").filter(Boolean);
  if (parts.length === 0) return "";
  return `/${parts
    .map((p) => encodeURIComponent(String(p)))
    .filter((s) => s.length > 0)
    .join("/")}`;
}

/**
 * @param {Record<string, unknown> | undefined} query
 */
function buildQuery(query) {
  if (!query) return "";
  /** @type {string[]} */
  const pairs = [];
  for (const key of Object.keys(query).sort()) {
    const v = query[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item === undefined || item === null) continue;
        pairs.push(`${encode(key)}=${encode(item)}`);
      }
      continue;
    }
    pairs.push(`${encode(key)}=${encode(v)}`);
  }
  return pairs.length === 0 ? "" : `?${pairs.join("&")}`;
}

/**
 * @param {unknown} v
 */
function encode(v) {
  return encodeURIComponent(v instanceof Date ? v.toISOString() : String(v));
}
