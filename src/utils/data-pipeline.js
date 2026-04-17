/**
 * src/utils/data-pipeline.js — Composable data transformation pipeline (Sprint 168)
 *
 * Provides a fluent API for building synchronous or async data transformation
 * pipelines (map → filter → reduce → sort → group → paginate).
 *
 * Usage:
 *   const result = await pipeline(guests)
 *     .map(toGuestViewModel)
 *     .filter(g => g.status === "confirmed")
 *     .sortBy("lastName")
 *     .groupBy("side")
 *     .toObject();
 */

/**
 * @template T, U
 * @param {T[]} items
 */
export class Pipeline {
  /** @param {T[]} source */
  constructor(source) {
    this._data = Array.isArray(source) ? [...source] : [];
  }

  /**
   * Apply a transform function to each item.
   * @template U
   * @param {(item: T, index: number) => U} fn
   * @returns {Pipeline<U>}
   */
  map(fn) {
    return /** @type {Pipeline<U>} */ (new Pipeline(this._data.map(fn)));
  }

  /**
   * Keep only items where predicate returns true.
   * @param {(item: T) => boolean} fn
   * @returns {Pipeline<T>}
   */
  filter(fn) {
    return new Pipeline(this._data.filter(fn));
  }

  /**
   * Sort items by a key or comparator.
   * @param {((a: T, b: T) => number) | keyof T} keyOrFn
   * @param {'asc' | 'desc'} [dir]
   * @returns {Pipeline<T>}
   */
  sortBy(keyOrFn, dir = "asc") {
    const d = dir === "desc" ? -1 : 1;
    const comparator = typeof keyOrFn === "function"
      ? keyOrFn
      : (/** @type {T} */ a, /** @type {T} */ b) => {
          const av = /** @type {Record<string, unknown>} */ (a)[/** @type {string} */ (keyOrFn)] ?? "";
          const bv = /** @type {Record<string, unknown>} */ (b)[/** @type {string} */ (keyOrFn)] ?? "";
          if (av < bv) return -1 * d;
          if (av > bv) return 1 * d;
          return 0;
        };
    return new Pipeline([...this._data].sort(comparator));
  }

  /**
   * Take only the first n items.
   * @param {number} n
   * @returns {Pipeline<T>}
   */
  take(n) {
    return new Pipeline(this._data.slice(0, n));
  }

  /**
   * Skip the first n items.
   * @param {number} n
   * @returns {Pipeline<T>}
   */
  skip(n) {
    return new Pipeline(this._data.slice(n));
  }

  /**
   * Remove duplicate values using an optional key extractor.
   * @param {((item: T) => unknown)} [keyFn]
   * @returns {Pipeline<T>}
   */
  unique(keyFn) {
    const seen = new Set();
    const unique = this._data.filter((item) => {
      const key = keyFn ? keyFn(item) : item;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return new Pipeline(unique);
  }

  /**
   * Reduce to a single value.
   * @template R
   * @param {(acc: R, item: T, index: number) => R} fn
   * @param {R} initial
   * @returns {R}
   */
  reduce(fn, initial) {
    return this._data.reduce(fn, initial);
  }

  /**
   * Group items by a key extractor. Returns a plain object.
   * @param {((item: T) => string) | keyof T} keyOrFn
   * @returns {Record<string, T[]>}
   */
  groupBy(keyOrFn) {
    const keyFn = typeof keyOrFn === "function"
      ? keyOrFn
      : (/** @type {T} */ item) => String(/** @type {Record<string, unknown>} */ (item)[/** @type {string} */ (keyOrFn)] ?? "");
    /** @type {Record<string, T[]>} */
    const groups = {};
    for (const item of this._data) {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }

  /**
   * Return the resulting array.
   * @returns {T[]}
   */
  toArray() {
    return this._data;
  }

  /**
   * Count items in the current pipeline.
   * @returns {number}
   */
  count() {
    return this._data.length;
  }

  /**
   * Return summarised stats (sum, avg, min, max) for a numeric field.
   * @param {keyof T} field
   * @returns {{ sum: number, avg: number, min: number, max: number, count: number }}
   */
  stats(field) {
    const nums = this._data.map(
      (item) => Number(/** @type {Record<string, unknown>} */ (item)[/** @type {string} */ (field)] ?? 0),
    );
    if (!nums.length) return { sum: 0, avg: 0, min: 0, max: 0, count: 0 };
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      sum,
      avg: sum / nums.length,
      min: Math.min(...nums),
      max: Math.max(...nums),
      count: nums.length,
    };
  }

  /**
   * Apply an async transform to each item and resolve all concurrently.
   * @template U
   * @param {(item: T) => Promise<U>} fn
   * @returns {Promise<Pipeline<U>>}
   */
  async mapAsync(fn) {
    const results = await Promise.all(this._data.map(fn));
    return /** @type {Pipeline<U>} */ (new Pipeline(results));
  }

  /**
   * Execute a side-effect for each item (does not modify pipeline).
   * @param {(item: T) => void} fn
   * @returns {Pipeline<T>}
   */
  tap(fn) {
    this._data.forEach(fn);
    return this;
  }
}

/**
 * Create a pipeline from an array.
 * @template T
 * @param {T[]} source
 * @returns {Pipeline<T>}
 */
export function pipeline(source) {
  return new Pipeline(source);
}
