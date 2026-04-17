/**
 * src/utils/lazy-loader.js — Deferred module / resource loading utilities (Sprint 173)
 *
 * Provides helpers for:
 *  - Lazy-loading a value once on first access (memoized async factory)
 *  - Debounced and throttled function wrappers
 *  - Once-only execution wrapper
 *
 * Zero dependencies. Does not use dynamic import (handled by section-loader).
 */

/**
 * Memoize an async factory — calls `factory` once and caches the result.
 * Subsequent calls return the cached promise.
 *
 * @template T
 * @param {() => Promise<T>} factory
 * @returns {() => Promise<T>}
 */
export function lazy(factory) {
  /** @type {Promise<T> | null} */
  let cached = null;
  return () => {
    if (!cached) cached = factory();
    return cached;
  };
}

/**
 * Returns a function that, when called, resets the lazy cache so factory
 * will be re-invoked on the next call. Useful for testing or forced refresh.
 *
 * @template T
 * @param {() => Promise<T>} factory
 * @returns {{ get: () => Promise<T>, reset: () => void }}
 */
export function lazyResettable(factory) {
  /** @type {Promise<T> | null} */
  let cached = null;
  return {
    get: () => {
      if (!cached) cached = factory();
      return cached;
    },
    reset: () => { cached = null; },
  };
}

/**
 * Debounce — only invoke `fn` after `wait` ms have elapsed since the last call.
 *
 * @template {(...args: unknown[]) => void} T
 * @param {T} fn
 * @param {number} wait
 * @returns {T & { cancel: () => void }}
 */
export function debounce(fn, wait) {
  let timer = null;

  const debounced = function (...args) {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };

  debounced.cancel = () => {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  };

  return /** @type {T & { cancel: () => void }} */ (debounced);
}

/**
 * Throttle — invoke `fn` at most once per `wait` ms.
 *
 * @template {(...args: unknown[]) => void} T
 * @param {T} fn
 * @param {number} wait
 * @returns {T & { cancel: () => void }}
 */
export function throttle(fn, wait) {
  let lastCall = 0;
  let timer = null;

  const throttled = function (...args) {
    const now = Date.now();
    const remaining = wait - (now - lastCall);
    if (remaining <= 0) {
      if (timer !== null) { clearTimeout(timer); timer = null; }
      lastCall = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };

  throttled.cancel = () => {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    lastCall = 0;
  };

  return /** @type {T & { cancel: () => void }} */ (throttled);
}

/**
 * Once — wrap `fn` so it only executes the first time it is called.
 * Subsequent invocations return the first result.
 *
 * @template T
 * @param {() => T} fn
 * @returns {() => T}
 */
export function once(fn) {
  let called = false;
  let result;
  return () => {
    if (!called) {
      called = true;
      result = fn();
    }
    return result;
  };
}

/**
 * Memoize a synchronous function by its first argument (string/number key).
 *
 * @template T
 * @param {(key: string) => T} fn
 * @returns {(key: string) => T}
 */
export function memoize(fn) {
  /** @type {Map<string, T>} */
  const cache = new Map();
  return (key) => {
    if (!cache.has(key)) cache.set(key, fn(key));
    return /** @type {T} */ (cache.get(key));
  };
}
