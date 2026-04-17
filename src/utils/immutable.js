/**
 * src/utils/immutable.js — Immutable array/object update helpers (Phase 2)
 *
 * Pure functions that return new collections instead of mutating in place.
 * Use in store updates and repository writes to prevent accidental shared
 * state mutations. All functions are side-effect-free.
 *
 * Usage:
 *   import { replaceById, removeById, updateById, insertSorted, appendUnique, toggleIn } from "../utils/immutable.js";
 *
 *   const guests = storeGet("guests") ?? [];
 *   storeSet("guests", replaceById(guests, id, patch));
 */

// ── Array helpers ──────────────────────────────────────────────────────────

/**
 * Return a new array with the item matching `id` shallow-merged with `patch`.
 * If no item matches, the original array is returned unchanged.
 *
 * @template {{ id: string }} T
 * @param {T[]} arr
 * @param {string} id
 * @param {Partial<T>} patch
 * @returns {T[]}
 */
export function replaceById(arr, id, patch) {
  let found = false;
  const next = arr.map((item) => {
    if (item.id === id) {
      found = true;
      return /** @type {T} */ ({ ...item, ...patch });
    }
    return item;
  });
  return found ? next : arr;
}

/**
 * Return a new array without the item matching `id`.
 * If no item matches, the original array is returned unchanged.
 *
 * @template {{ id: string }} T
 * @param {T[]} arr
 * @param {string} id
 * @returns {T[]}
 */
export function removeById(arr, id) {
  const next = arr.filter((item) => item.id !== id);
  return next.length === arr.length ? arr : next;
}

/**
 * Return a new array with the item matching `id` transformed by `updater`.
 * `updater` receives the existing item and must return the new item.
 * If no item matches, the original array is returned unchanged.
 *
 * @template {{ id: string }} T
 * @param {T[]} arr
 * @param {string} id
 * @param {(item: T) => T} updater
 * @returns {T[]}
 */
export function updateById(arr, id, updater) {
  let found = false;
  const next = arr.map((item) => {
    if (item.id === id) {
      found = true;
      return updater(item);
    }
    return item;
  });
  return found ? next : arr;
}

/**
 * Insert `item` into a sorted position in `arr` based on the string value of `key`.
 * Items with the same key value are inserted after existing equal items (stable).
 *
 * @template {Record<string, unknown>} T
 * @param {T[]} arr
 * @param {T} item
 * @param {keyof T} key
 * @param {'asc'|'desc'} [dir]
 * @returns {T[]}
 */
export function insertSorted(arr, item, key, dir = "asc") {
  const val = String(item[key] ?? "");
  let idx = arr.length;
  for (let i = 0; i < arr.length; i++) {
    const cmp = val.localeCompare(String(arr[i][key] ?? ""), undefined, { sensitivity: "base" });
    if ((dir === "asc" && cmp < 0) || (dir === "desc" && cmp > 0)) {
      idx = i;
      break;
    }
  }
  return [...arr.slice(0, idx), item, ...arr.slice(idx)];
}

/**
 * Append `item` to `arr` only if no existing item has the same `key` value.
 * Returns the original array if a duplicate is detected.
 *
 * @template {Record<string, unknown>} T
 * @param {T[]} arr
 * @param {T} item
 * @param {keyof T} [key]  Defaults to "id"
 * @returns {T[]}
 */
export function appendUnique(arr, item, key = /** @type {keyof T} */ ("id")) {
  const val = item[key];
  const exists = arr.some((existing) => existing[key] === val);
  return exists ? arr : [...arr, item];
}

/**
 * If `item` (matched by `key`) is in `arr`, remove it; otherwise append it.
 * Returns a new array in either case.
 *
 * @template {Record<string, unknown>} T
 * @param {T[]} arr
 * @param {T} item
 * @param {keyof T} [key]  Defaults to "id"
 * @returns {T[]}
 */
export function toggleIn(arr, item, key = /** @type {keyof T} */ ("id")) {
  const val = item[key];
  const idx = arr.findIndex((existing) => existing[key] === val);
  if (idx === -1) return [...arr, item];
  return [...arr.slice(0, idx), ...arr.slice(idx + 1)];
}

// ── Object helpers ─────────────────────────────────────────────────────────

/**
 * Return a new object with the given keys omitted.
 *
 * @template {Record<string, unknown>} T
 * @param {T} obj
 * @param {(keyof T)[]} keys
 * @returns {Partial<T>}
 */
export function omitKeys(obj, keys) {
  /** @type {Partial<T>} */
  const result = {};
  for (const k of /** @type {string[]} */ (Object.keys(obj))) {
    if (!/** @type {string[]} */ (keys).includes(k)) {
      result[/** @type {keyof T} */ (k)] = obj[/** @type {keyof T} */ (k)];
    }
  }
  return result;
}

/**
 * Return a new object with only the given keys included.
 *
 * @template {Record<string, unknown>} T
 * @param {T} obj
 * @param {(keyof T)[]} keys
 * @returns {Partial<T>}
 */
export function pickKeys(obj, keys) {
  /** @type {Partial<T>} */
  const result = {};
  for (const k of /** @type {string[]} */ (keys)) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      result[/** @type {keyof T} */ (k)] = obj[/** @type {keyof T} */ (k)];
    }
  }
  return result;
}

/**
 * Deep-clone a plain JSON-serializable value.
 * Use for taking snapshots before destructive mutations.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
