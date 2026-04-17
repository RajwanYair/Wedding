/**
 * src/utils/object-path.js — Nested object path utilities (Sprint 208)
 *
 * Safe get, set, delete on deeply nested object paths using dot-notation.
 * Zero dependencies. Pure functions – does not mutate the original for get/has.
 */

/**
 * Get a value at a dot-separated path from an object.
 * Returns `undefined` (or `defaultVal`) if any segment is nullish.
 *
 * @param {Record<string, unknown>} obj
 * @param {string} path  e.g. "user.address.city"
 * @param {unknown} [defaultVal]
 * @returns {unknown}
 */
export function getIn(obj, path, defaultVal = undefined) {
  if (obj == null || !path) return defaultVal;
  const val = path.split(".").reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
  return val === undefined ? defaultVal : val;
}

/**
 * Check whether a path exists (and is not undefined) in an object.
 * @param {Record<string, unknown>} obj
 * @param {string} path
 * @returns {boolean}
 */
export function hasIn(obj, path) {
  return getIn(obj, path) !== undefined;
}

/**
 * Immutable set: return a new deep-cloned object with `value` at `path`.
 *
 * @param {Record<string, unknown>} obj
 * @param {string} path
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
export function setIn(obj, path, value) {
  const keys = path.split(".");
  const result = _shallowClone(obj ?? {});
  let current = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    current[k] = _shallowClone(current[k] ?? {});
    current = current[k];
  }
  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * Immutable delete: return a new deep-cloned object with the key at `path` removed.
 * @param {Record<string, unknown>} obj
 * @param {string} path
 * @returns {Record<string, unknown>}
 */
export function deleteIn(obj, path) {
  const keys = path.split(".");
  const result = _shallowClone(obj ?? {});
  let current = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (current[k] == null) return result; // path doesn't exist
    current[k] = _shallowClone(current[k]);
    current = current[k];
  }
  delete current[keys[keys.length - 1]];
  return result;
}

/**
 * Get all leaves (paths to primitive values) from an object as an array of
 * [dotPath, value] tuples.
 *
 * @param {Record<string, unknown>} obj
 * @param {string} [prefix]
 * @returns {[string, unknown][]}
 */
export function flattenPaths(obj, prefix = "") {
  const entries = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      entries.push(...flattenPaths(/** @type {Record<string, unknown>} */ (v), fullKey));
    } else {
      entries.push([fullKey, v]);
    }
  }
  return entries;
}

/**
 * Pick specific paths from an object and return a new flat object.
 * @param {Record<string, unknown>} obj
 * @param {string[]} paths
 * @returns {Record<string, unknown>}
 */
export function pickPaths(obj, paths) {
  const result = {};
  for (const p of paths) {
    const v = getIn(obj, p);
    if (v !== undefined) result[p] = v;
  }
  return result;
}

/**
 * Shallow clone helper (only plain objects).
 * @param {Record<string, unknown>} obj
 * @returns {Record<string, unknown>}
 */
function _shallowClone(obj) {
  return Array.isArray(obj) ? [...obj] : { ...obj };
}
