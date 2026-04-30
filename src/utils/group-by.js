/**
 * Tiny grouping/aggregation toolbox.  All functions are pure and immutable.
 */

/**
 * Group rows by a key (string or selector function).
 *
 * @template T
 * @param {ReadonlyArray<T>} rows
 * @param {string | ((row: T) => string | number)} key
 * @returns {Record<string, T[]>}
 */
export function groupBy(rows, key) {
  /** @type {Record<string, T[]>} */
  const out = {};
  if (!Array.isArray(rows)) return out;
  const get = toGetter(key);
  for (const row of rows) {
    const k = String(get(row));
    if (!out[k]) out[k] = [];
    out[k].push(row);
  }
  return out;
}

/**
 * Count rows per group.
 *
 * @template T
 * @param {ReadonlyArray<T>} rows
 * @param {string | ((row: T) => string | number)} key
 * @returns {Record<string, number>}
 */
export function countBy(rows, key) {
  /** @type {Record<string, number>} */
  const out = {};
  if (!Array.isArray(rows)) return out;
  const get = toGetter(key);
  for (const row of rows) {
    const k = String(get(row));
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/**
 * Sum a numeric value per group.
 *
 * @template T
 * @param {ReadonlyArray<T>} rows
 * @param {string | ((row: T) => string | number)} key
 * @param {string | ((row: T) => number)} value
 * @returns {Record<string, number>}
 */
export function sumBy(rows, key, value) {
  /** @type {Record<string, number>} */
  const out = {};
  if (!Array.isArray(rows)) return out;
  const getKey = toGetter(key);
  const getVal = toGetter(value);
  for (const row of rows) {
    const k = String(getKey(row));
    const v = Number(getVal(row));
    if (!Number.isFinite(v)) continue;
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

/**
 * Pivot table — rows × columns × numeric value, returning a nested map.
 *
 * @template T
 * @param {ReadonlyArray<T>} rows
 * @param {string | ((row: T) => string | number)} rowKey
 * @param {string | ((row: T) => string | number)} colKey
 * @param {string | ((row: T) => number)} value
 * @returns {Record<string, Record<string, number>>}
 */
export function pivot(rows, rowKey, colKey, value) {
  /** @type {Record<string, Record<string, number>>} */
  const out = {};
  if (!Array.isArray(rows)) return out;
  const r = toGetter(rowKey);
  const c = toGetter(colKey);
  const v = toGetter(value);
  for (const row of rows) {
    const rk = String(r(row));
    const ck = String(c(row));
    const num = Number(v(row));
    if (!Number.isFinite(num)) continue;
    if (!out[rk]) out[rk] = {};
    out[rk][ck] = (out[rk][ck] ?? 0) + num;
  }
  return out;
}

/**
 * @template T
 * @template R
 * @param {string | ((row: T) => R)} key
 * @returns {(row: T) => R}
 */
function toGetter(key) {
  if (typeof key === "function") return key;
  return (/** @type {any} */ row) =>
    row == null ? undefined : row[/** @type {string} */ (key)];
}
