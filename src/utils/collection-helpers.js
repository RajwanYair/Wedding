/**
 * src/utils/collection-helpers.js — Array/collection utilities (Sprint 182)
 *
 * Pure functions — no DOM, no side effects.
 */

/**
 * Group an array by a key or key-function.
 * @template T
 * @param {T[]} arr
 * @param {((item: T) => string) | keyof T} keyFn
 * @returns {Record<string, T[]>}
 */
export function groupBy(arr, keyFn) {
  const fn = typeof keyFn === "function" ? keyFn : (item) => String(item[keyFn]);
  /** @type {Record<string, T[]>} */
  const result = {};
  for (const item of arr) {
    const key = fn(item);
    (result[key] ??= []).push(item);
  }
  return result;
}

/**
 * Partition an array into [matches, nonMatches].
 * @template T
 * @param {T[]} arr
 * @param {(item: T) => boolean} predicate
 * @returns {[T[], T[]]}
 */
export function partition(arr, predicate) {
  /** @type {T[]} */
  const yes = [];
  /** @type {T[]} */
  const no = [];
  for (const item of arr) (predicate(item) ? yes : no).push(item);
  return [yes, no];
}

/**
 * Split an array into chunks of given size.
 * @template T
 * @param {T[]} arr
 * @param {number} size
 * @returns {T[][]}
 */
export function chunk(arr, size) {
  if (size < 1) throw new RangeError("chunk size must be >= 1");
  const result = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

/**
 * Flatten one level deep.
 * @template T
 * @param {(T | T[])[]} arr
 * @returns {T[]}
 */
export function flatten(arr) {
  return arr.flat();
}

/**
 * Return unique values (referential equality).
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function unique(arr) {
  return [...new Set(arr)];
}

/**
 * Return unique objects by a key field.
 * @template T
 * @param {T[]} arr
 * @param {keyof T} key
 * @returns {T[]}
 */
export function uniqueBy(arr, key) {
  const seen = new Set();
  return arr.filter((item) => {
    const k = item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Values present in both arrays.
 * @template T
 * @param {T[]} a
 * @param {T[]} b
 * @returns {T[]}
 */
export function intersection(a, b) {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

/**
 * Values in `a` not present in `b`.
 * @template T
 * @param {T[]} a
 * @param {T[]} b
 * @returns {T[]}
 */
export function difference(a, b) {
  const setB = new Set(b);
  return a.filter((x) => !setB.has(x));
}

/**
 * Index an array of objects by a key field, returning a Map.
 * @template T
 * @param {T[]} arr
 * @param {keyof T} key
 * @returns {Map<unknown, T>}
 */
export function indexBy(arr, key) {
  return new Map(arr.map((item) => [item[key], item]));
}

/**
 * Move an element in-place from `fromIdx` to `toIdx`.
 * @template T
 * @param {T[]} arr
 * @param {number} fromIdx
 * @param {number} toIdx
 * @returns {T[]}
 */
export function moveElement(arr, fromIdx, toIdx) {
  const copy = [...arr];
  const [item] = copy.splice(fromIdx, 1);
  copy.splice(toIdx, 0, item);
  return copy;
}
