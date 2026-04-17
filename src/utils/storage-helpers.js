/**
 * src/utils/storage-helpers.js — localStorage helpers (Sprint 186)
 *
 * Typed wrappers around localStorage with JSON serialisation.
 * All keys use `wedding_v1_` prefix automatically.
 * Pure — no DOM events, no side-effects beyond storage reads/writes.
 */

const PREFIX = "wedding_v1_";

/**
 * @template T
 * Persist `value` as JSON under the prefixed key.
 * Silently ignores quota errors.
 * @param {string} key  Without prefix
 * @param {T} value
 */
export function storageSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch { /* quota exceeded — ignore */ }
}

/**
 * @template T
 * Read and JSON-parse the value stored under the prefixed key.
 * Returns `defaultValue` on missing key or parse error.
 * @param {string} key  Without prefix
 * @param {T} [defaultValue]
 * @returns {T}
 */
export function storageGet(key, defaultValue = undefined) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return /** @type {T} */ (defaultValue);
    return /** @type {T} */ (JSON.parse(raw));
  } catch {
    return /** @type {T} */ (defaultValue);
  }
}

/**
 * Remove the prefixed key from localStorage.
 * @param {string} key  Without prefix
 */
export function storageRemove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch { /* ignore */ }
}

/**
 * Return true if the prefixed key exists in localStorage.
 * @param {string} key  Without prefix
 * @returns {boolean}
 */
export function storageHas(key) {
  try {
    return localStorage.getItem(PREFIX + key) !== null;
  } catch {
    return false;
  }
}

/**
 * List all keys managed by this app (strip prefix).
 * @returns {string[]}
 */
export function storageKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k.slice(PREFIX.length));
    }
  } catch { /* ignore */ }
  return keys;
}

/**
 * Atomically update a stored object by merging `patch` into it.
 * If no existing value, uses `patch` as the initial value.
 * @template {Record<string, unknown>} T
 * @param {string} key  Without prefix
 * @param {Partial<T>} patch
 * @returns {T} The new merged value
 */
export function storageMerge(key, patch) {
  const existing = storageGet(key, {});
  const merged = /** @type {T} */ ({ ...existing, ...patch });
  storageSet(key, merged);
  return merged;
}
