/**
 * Array chunking helpers — split into fixed-size chunks, into N parts,
 * and group consecutive runs.
 * @owner shared
 */

/**
 * Split an array into chunks of `size` (last chunk may be shorter).
 *
 * @template T
 * @param {ReadonlyArray<T>} arr
 * @param {number} size
 * @returns {T[][]}
 */
export function chunk(arr, size) {
  if (!Array.isArray(arr) || !Number.isInteger(size) || size < 1) return [];
  /** @type {T[][]} */
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Split an array into `parts` groups of (roughly) equal size.
 *
 * @template T
 * @param {ReadonlyArray<T>} arr
 * @param {number} parts
 * @returns {T[][]}
 */
export function partition(arr, parts) {
  if (!Array.isArray(arr) || !Number.isInteger(parts) || parts < 1) return [];
  /** @type {T[][]} */
  const out = Array.from({ length: parts }, () => []);
  const base = Math.floor(arr.length / parts);
  const extra = arr.length % parts;
  let idx = 0;
  for (let p = 0; p < parts; p += 1) {
    const len = base + (p < extra ? 1 : 0);
    for (let j = 0; j < len; j += 1) out[p].push(arr[idx++]);
  }
  return out;
}

/**
 * Group consecutive items that share the same key.
 *
 * @template T
 * @template K
 * @param {ReadonlyArray<T>} arr
 * @param {(item: T) => K} keyFn
 * @returns {T[][]}
 */
export function groupConsecutive(arr, keyFn) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  /** @type {T[][]} */
  const out = [];
  /** @type {K | undefined} */
  let lastKey;
  /** @type {T[]} */
  let group = [];
  for (let i = 0; i < arr.length; i += 1) {
    const key = keyFn(arr[i]);
    if (i === 0 || key === lastKey) {
      group.push(arr[i]);
    } else {
      out.push(group);
      group = [arr[i]];
    }
    lastKey = key;
  }
  if (group.length > 0) out.push(group);
  return out;
}
