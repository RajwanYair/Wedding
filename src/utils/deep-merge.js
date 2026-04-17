/**
 * src/utils/deep-merge.js — Deep object merging utility (Sprint 163)
 *
 * Provides safe, immutable deep merge helpers for plain objects and arrays.
 * Used when applying patches, merging config, and conflict resolution.
 *
 * Rules:
 *  - Only plain objects (not arrays, dates, etc.) are merged recursively.
 *  - Arrays are replaced, not merged (use mergeArraysById for keyed merges).
 *  - undefined values in source skip the target key (use null to clear).
 *  - Returns a new object; neither argument is mutated.
 */

/**
 * Determine if a value is a plain object (not null, not array, not Date etc.)
 * @param {unknown} val
 * @returns {val is Record<string, unknown>}
 */
function isPlainObject(val) {
  return val !== null && typeof val === "object" && !Array.isArray(val) &&
    Object.getPrototypeOf(val) === Object.prototype;
}

/**
 * Deep-merge `source` into `target`. Returns a new object.
 * Source keys with undefined values are skipped.
 *
 * @template {Record<string, unknown>} T
 * @param {T} target
 * @param {Partial<T>} source
 * @returns {T}
 */
export function deepMerge(target, source) {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return /** @type {T} */ (source !== undefined ? source : target);
  }

  const result = /** @type {Record<string, unknown>} */ ({ ...target });

  for (const [key, srcVal] of Object.entries(source)) {
    if (srcVal === undefined) continue; // skip undefined — use null to clear
    const tgtVal = result[key];
    if (isPlainObject(tgtVal) && isPlainObject(srcVal)) {
      result[key] = deepMerge(
        /** @type {Record<string, unknown>} */ (tgtVal),
        /** @type {Record<string, unknown>} */ (srcVal),
      );
    } else {
      result[key] = srcVal;
    }
  }

  return /** @type {T} */ (result);
}

/**
 * Deep-merge multiple sources left to right.
 *
 * @template {Record<string, unknown>} T
 * @param {T} base
 * @param {...Partial<T>} sources
 * @returns {T}
 */
export function deepMergeAll(base, ...sources) {
  return sources.reduce(
    (acc, src) => deepMerge(acc, /** @type {Partial<T>} */ (src)),
    base,
  );
}

/**
 * Merge two arrays of objects by a key property.
 * Items in `updates` are merged into matching items in `base`.
 * Items not in `base` are appended; items not in `updates` are kept unchanged.
 *
 * @template {{ [key: string]: unknown }} T
 * @param {T[]} base
 * @param {Partial<T>[]} updates
 * @param {keyof T} [keyProp]
 * @returns {T[]}
 */
export function mergeArraysById(base, updates, keyProp = "id") {
  const updateMap = new Map(updates.map((item) => [item[keyProp], item]));

  const merged = base.map((item) => {
    const update = updateMap.get(item[keyProp]);
    if (update) {
      updateMap.delete(item[keyProp]); // Mark as consumed
      return deepMerge(item, /** @type {Partial<typeof item>} */ (update));
    }
    return item;
  });

  // Append new items (those that weren't in base)
  for (const item of updateMap.values()) {
    merged.push(/** @type {T} */ (item));
  }

  return merged;
}

/**
 * Pick specific keys from an object.
 *
 * @template {Record<string, unknown>} T
 * @param {T} obj
 * @param {(keyof T)[]} keys
 * @returns {Partial<T>}
 */
export function pick(obj, keys) {
  /** @type {Partial<T>} */
  const result = {};
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/**
 * Omit specific keys from an object.
 *
 * @template {Record<string, unknown>} T
 * @param {T} obj
 * @param {(keyof T)[]} keys
 * @returns {Partial<T>}
 */
export function omit(obj, keys) {
  const skipSet = new Set(keys);
  return /** @type {Partial<T>} */ (
    Object.fromEntries(
      Object.entries(obj).filter(([k]) => !skipSet.has(/** @type {keyof T} */ (k))),
    )
  );
}
