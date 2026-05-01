/**
 * Fisher–Yates shuffle helpers.  Pure / non-mutating by default; pass
 * an explicit RNG to make the shuffle deterministic (seating drafts,
 * unit tests, demo data).
 * @owner shared
 */

/**
 * Mulberry32 PRNG — small, fast, deterministic.
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

/**
 * Return a shuffled copy of `arr`.
 *
 * @template T
 * @param {readonly T[]} arr
 * @param {() => number} [rng] — defaults to `Math.random`
 * @returns {T[]}
 */
export function shuffle(arr, rng = Math.random) {
  if (!Array.isArray(arr)) {
    throw new TypeError("shuffle: expected array");
  }
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick `k` distinct random elements from `arr` (without replacement).
 *
 * @template T
 * @param {readonly T[]} arr
 * @param {number} k
 * @param {() => number} [rng]
 * @returns {T[]}
 */
export function sample(arr, k, rng = Math.random) {
  if (!Array.isArray(arr)) {
    throw new TypeError("sample: expected array");
  }
  if (!Number.isInteger(k) || k < 0) {
    throw new RangeError("sample: k must be non-negative integer");
  }
  if (k >= arr.length) return shuffle(arr, rng);
  return shuffle(arr, rng).slice(0, k);
}

/**
 * In-place shuffle (mutates `arr`).  Returns the same array for chaining.
 *
 * @template T
 * @param {T[]} arr
 * @param {() => number} [rng]
 * @returns {T[]}
 */
export function shuffleInPlace(arr, rng = Math.random) {
  if (!Array.isArray(arr)) {
    throw new TypeError("shuffleInPlace: expected array");
  }
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
