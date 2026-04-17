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

// ── Deep path helpers (Sprint 67) ─────────────────────────────────────────

/**
 * Return a new object/array with the value at `path` set to `value`.
 * Creates intermediate objects if they don't exist.
 *
 * @param {Record<string, unknown>} obj
 * @param {(string|number)[]} path
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
export function setIn(obj, path, value) {
  if (path.length === 0) return /** @type {Record<string, unknown>} */ (value);
  const [head, ...tail] = path;
  const key = String(head);
  const child = Object.prototype.hasOwnProperty.call(obj, key)
    ? obj[key]
    : (typeof tail[0] === "number" ? [] : {});
  return {
    ...obj,
    [key]: setIn(/** @type {Record<string, unknown>} */ (child ?? {}), tail, value),
  };
}

/**
 * Return a new object/array with the value at `path` transformed by `updater`.
 * If the path doesn't exist, `updater` receives `undefined`.
 *
 * @param {Record<string, unknown>} obj
 * @param {(string|number)[]} path
 * @param {(current: unknown) => unknown} updater
 * @returns {Record<string, unknown>}
 */
export function updateIn(obj, path, updater) {
  if (path.length === 0) {
    return /** @type {Record<string, unknown>} */ (updater(obj));
  }
  const [head, ...tail] = path;
  const key = String(head);
  const child = obj[key] ?? {};
  return {
    ...obj,
    [key]: updateIn(/** @type {Record<string, unknown>} */ (child), tail, updater),
  };
}

/**
 * Return a new object with the key at `path` deleted.
 * Ancestor objects are shallow-cloned.
 *
 * @param {Record<string, unknown>} obj
 * @param {(string|number)[]} path
 * @returns {Record<string, unknown>}
 */
export function deleteIn(obj, path) {
  if (path.length === 0) return obj;
  const [head, ...tail] = path;
  const key = String(head);
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return obj;
  if (tail.length === 0) {
    const copy = { ...obj };
    delete copy[key];
    return copy;
  }
  return {
    ...obj,
    [key]: deleteIn(/** @type {Record<string, unknown>} */ (obj[key] ?? {}), tail),
  };
}

/**
 * Deep-merge `source` into `target`, returning a new object.
 * Arrays are replaced (not concatenated).
 *
 * @template {Record<string, unknown>} T
 * @param {T} target
 * @param {Partial<T>} source
 * @returns {T}
 */
export function mergeDeep(target, source) {
  /** @type {Record<string, unknown>} */
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[/** @type {keyof T} */ (key)];
    const tgtVal = result[key];
    if (
      srcVal !== null &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = mergeDeep(
        /** @type {Record<string, unknown>} */ (tgtVal),
        /** @type {Record<string, unknown>} */ (srcVal)
      );
    } else {
      result[key] = srcVal;
    }
  }
  return /** @type {T} */ (result);
}
