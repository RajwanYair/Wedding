/**
 * src/utils/storage-helpers.js — localStorage helpers (Sprint 186)
 *
 * Typed wrappers around localStorage with JSON serialisation.
 * All keys use `wedding_v1_` prefix automatically.
 * Pure — no DOM events, no side-effects beyond storage reads/writes.
 */

import { STORAGE_PREFIX } from "../core/config.js";
import {
  listBrowserStorageKeys,
  readBrowserStorage,
  readBrowserStorageJson,
  removeBrowserStorage,
  writeBrowserStorageJson,
} from "../core/storage.js";

const PREFIX = STORAGE_PREFIX;

/**
 * @template T
 * Persist `value` as JSON under the prefixed key.
 * Silently ignores quota errors.
 * @param {string} key  Without prefix
 * @param {T} value
 */
export function storageSet(key, value) {
  writeBrowserStorageJson(PREFIX + key, value);
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
  return readBrowserStorageJson(PREFIX + key, /** @type {T} */ (defaultValue));
}

/**
 * Remove the prefixed key from localStorage.
 * @param {string} key  Without prefix
 */
export function storageRemove(key) {
  removeBrowserStorage(PREFIX + key);
}

/**
 * Return true if the prefixed key exists in localStorage.
 * @param {string} key  Without prefix
 * @returns {boolean}
 */
export function storageHas(key) {
  return readBrowserStorage(PREFIX + key) !== null;
}

/**
 * List all keys managed by this app (strip prefix).
 * @returns {string[]}
 */
export function storageKeys() {
  return listBrowserStorageKeys(PREFIX).map((key) => key.slice(PREFIX.length));
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
