/**
 * src/utils/admin-debug.js — Admin debug utilities (Sprint 39)
 *
 * Provides development-time helpers for inspecting, diffing and validating
 * the in-memory store.  All functions are safe to call in production
 * (they are read-only except `resetToDefaults`) but are intended for the
 * admin settings panel and Vitest test helpers.
 *
 * Usage:
 *   import { dumpStore, diffStore, validateStoreShape } from "../utils/admin-debug.js";
 *
 *   const before = dumpStore();
 *   storeSet("guests", updatedGuests);
 *   const after = dumpStore();
 *   console.table(diffStore(before, after));
 */

import { storeGet, storeSet, getSubscriptionCount } from "../core/store.js";
import { STORE_DATA_CLASS } from "../core/constants.js";

/** Known store domain keys derived from STORE_DATA_CLASS */
const KNOWN_STORE_KEYS = Object.keys(STORE_DATA_CLASS);

// ── dumpStore ──────────────────────────────────────────────────────────────

/**
 * Snapshot the current store state for all known store keys.
 * Returns a plain object — values are deep-cloned to avoid reference aliasing.
 *
 * @param {string[]} [keys]  Subset of keys; defaults to all `KNOWN_STORE_KEYS`
 * @returns {Record<string, unknown>}
 */
export function dumpStore(keys) {
  const target = keys ?? KNOWN_STORE_KEYS;
  /** @type {Record<string, unknown>} */
  const snapshot = {};
  for (const k of target) {
    const v = storeGet(k);
    try {
      snapshot[k] = JSON.parse(JSON.stringify(v));
    } catch {
      snapshot[k] = v;
    }
  }
  return snapshot;
}

// ── diffStore ─────────────────────────────────────────────────────────────

/**
 * @typedef {{ key: string, before: unknown, after: unknown }} StoreChange
 */

/**
 * Compare two store snapshots and return the keys whose values have changed.
 * Uses `JSON.stringify` for deep comparison.
 *
 * @param {Record<string, unknown>} before
 * @param {Record<string, unknown>} after
 * @returns {StoreChange[]}
 */
export function diffStore(before, after) {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  /** @type {StoreChange[]} */
  const changes = [];

  for (const key of allKeys) {
    const bStr = JSON.stringify(before[key]);
    const aStr = JSON.stringify(after[key]);
    if (bStr !== aStr) {
      changes.push({ key, before: before[key], after: after[key] });
    }
  }

  return changes;
}

// ── validateStoreShape ────────────────────────────────────────────────────

/**
 * Check that every required store key exists and is neither `undefined` nor `null`.
 *
 * @param {string[]} [required]  Keys that must exist; defaults to `KNOWN_STORE_KEYS`
 * @returns {string[]}  Array of missing/null key names; empty = valid
 */
export function validateStoreShape(required) {
  const keys = required ?? KNOWN_STORE_KEYS;
  /** @type {string[]} */
  const missing = [];
  for (const k of keys) {
    const v = storeGet(k);
    if (v === undefined || v === null) missing.push(k);
  }
  return missing;
}

// ── getStoreHealth ────────────────────────────────────────────────────────

/**
 * @typedef {{ keys: string[], subscriberCount: number, missingKeys: string[] }} StoreHealth
 */

/**
 * Return a health summary of the current store state.
 *
 * @returns {StoreHealth}
 */
export function getStoreHealth() {
  const keys = KNOWN_STORE_KEYS.filter((k) => storeGet(k) !== undefined);
  const missingKeys = KNOWN_STORE_KEYS.filter((k) => storeGet(k) === undefined);
  const subscriberCount = getSubscriptionCount();

  return { keys, subscriberCount, missingKeys };
}

// ── resetKey ──────────────────────────────────────────────────────────────

/**
 * Reset a single store key to its default value.
 *
 * @param {string} key
 * @param {unknown} defaultValue
 */
export function resetKey(key, defaultValue) {
  storeSet(key, defaultValue);
}

// ── setDebugFlag / getDebugFlag ───────────────────────────────────────────
// Lightweight debug mode toggle stored in the store itself.

const DEBUG_KEY = "debugMode";

/**
 * @param {boolean} enabled
 */
export function setDebugFlag(enabled) {
  storeSet(DEBUG_KEY, enabled);
}

/**
 * @returns {boolean}
 */
export function getDebugFlag() {
  return Boolean(storeGet(DEBUG_KEY));
}
