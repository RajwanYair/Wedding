/**
 * src/utils/feature-flags.js — Sprint 134
 *
 * Lightweight runtime feature-flag system.
 * Flags live in-memory (can be overridden via URL params in dev).
 * No DOM side-effects at import time.
 */

/** @type {Record<string, boolean>} */
const _defaults = {};

/** @type {Record<string, boolean>} runtime overrides */
const _overrides = {};

/**
 * Register a feature flag with a default value.
 * @param {string} flag
 * @param {boolean} defaultValue
 */
export function registerFlag(flag, defaultValue) {
  _defaults[flag] = Boolean(defaultValue);
}

/**
 * Check if a feature flag is enabled.
 * Override order: _overrides > _defaults > false.
 * @param {string} flag
 * @returns {boolean}
 */
export function isEnabled(flag) {
  if (Object.prototype.hasOwnProperty.call(_overrides, flag)) return _overrides[flag];
  if (Object.prototype.hasOwnProperty.call(_defaults,  flag)) return _defaults[flag];
  return false;
}

/**
 * Override a flag at runtime (for testing or dev tools).
 * @param {string} flag
 * @param {boolean} value
 */
export function setFlag(flag, value) {
  _overrides[flag] = Boolean(value);
}

/**
 * Reset a runtime override (returns to default).
 * @param {string} flag
 */
export function resetFlag(flag) {
  delete _overrides[flag];
}

/**
 * Reset ALL overrides.
 */
export function resetAllFlags() {
  for (const key of Object.keys(_overrides)) {
    delete _overrides[key];
  }
}

/**
 * Return a snapshot of all flags (defaults + overrides).
 * @returns {Record<string, boolean>}
 */
export function getAllFlags() {
  return { ..._defaults, ..._overrides };
}

/**
 * Apply flag overrides from a URL search-params object.
 * Useful for `?ff_myFlag=true` dev URLs.
 * @param {URLSearchParams | Record<string, string>} params
 */
export function applyUrlFlags(params) {
  const entries = params instanceof URLSearchParams
    ? [...params.entries()]
    : Object.entries(params);

  for (const [key, value] of entries) {
    if (key.startsWith("ff_")) {
      const flag = key.slice(3);
      _overrides[flag] = value === "true" || value === "1";
    }
  }
}
