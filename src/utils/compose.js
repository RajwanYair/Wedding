/**
 * src/utils/compose.js — Functional composition helpers (Sprint 212)
 *
 * pipe, compose, curry, memoize, partial, once, noop, identity.
 * Pure functions — zero dependencies.
 */

/**
 * Pipe: left-to-right. Result of each fn is passed to next.
 * @template T
 * @param {...((x: T) => T)} fns
 * @returns {(x: T) => T}
 */
export function pipe(...fns) {
  return (x) => fns.reduce((v, f) => f(v), x);
}

/**
 * Compose: right-to-left.
 * @template T
 * @param {...((x: T) => T)} fns
 * @returns {(x: T) => T}
 */
export function compose(...fns) {
  return (x) => fns.reduceRight((v, f) => f(v), x);
}

/**
 * Curry a binary function.
 * @param {(a: unknown, b: unknown) => unknown} fn
 * @returns {(a: unknown) => (b: unknown) => unknown}
 */
export function curry2(fn) {
  return (a) => (b) => fn(a, b);
}

/**
 * Curry a ternary function.
 * @param {(a: unknown, b: unknown, c: unknown) => unknown} fn
 * @returns {(a: unknown) => (b: unknown) => (c: unknown) => unknown}
 */
export function curry3(fn) {
  return (a) => (b) => (c) => fn(a, b, c);
}

/**
 * Memoize a pure function (single argument).
 * @template T, R
 * @param {(x: T) => R} fn
 * @returns {(x: T) => R}
 */
export function memoize(fn) {
  const cache = new Map();
  return (x) => {
    if (cache.has(x)) return cache.get(x);
    const result = fn(x);
    cache.set(x, result);
    return result;
  };
}

/**
 * Memoize with a key-extractor for multi-arg functions.
 * @param {Function} fn
 * @param {Function} [keyFn]  Derives a cache key from all args. Default: JSON.stringify.
 * @returns {Function}
 */
export function memoizeKey(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  return (...args) => {
    const key = keyFn(...args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Partially apply a function by binding leading arguments.
 * @param {Function} fn
 * @param {...unknown} args
 * @returns {Function}
 */
export function partial(fn, ...args) {
  return (...rest) => fn(...args, ...rest);
}

/**
 * Wrap fn so it executes at most once.
 * @template T
 * @param {() => T} fn
 * @returns {() => T | undefined}
 */
export function onceOnly(fn) {
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
 * No-op — does nothing.
 */
export function noop() {}

/**
 * Identity — returns its argument.
 * @template T
 * @param {T} x
 * @returns {T}
 */
export function identity(x) {
  return x;
}

/**
 * Tap: call a side-effect fn and return the original value.
 * @template T
 * @param {(x: T) => void} fn
 * @returns {(x: T) => T}
 */
export function tap(fn) {
  return (x) => {
    fn(x);
    return x;
  };
}
