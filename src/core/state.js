/**
 * src/core/state.js — localStorage persistence layer (S0 named-export module)
 *
 * Thin wrapper around localStorage with JSON serialisation.
 * No window.* side effects.
 */

const PREFIX = "wedding_v1_";

/**
 * Save a value to localStorage.
 * @param {string} key   Key without prefix
 * @param {unknown} value
 */
export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {}
}

/**
 * Load a value from localStorage.
 * @template T
 * @param {string} key
 * @param {T} [fallback]
 * @returns {T | undefined}
 */
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return /** @type {T} */ (JSON.parse(raw));
  } catch {
    return fallback;
  }
}

/**
 * Remove a key from localStorage.
 * @param {string} key
 */
export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {}
}

/**
 * Clear all app keys from localStorage.
 */
export function clearAll() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}
