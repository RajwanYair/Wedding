/**
 * src/utils/observer.js — Lightweight observable / pub-sub (Sprint 174)
 *
 * Framework-agnostic observable that wraps a single value and notifies
 * subscribers on change. Useful for reactive mini-stores and cross-module
 * signal passing without full events.js overhead.
 *
 * Usage:
 *   const count = observable(0);
 *   const unsub = count.subscribe((v) => console.log("count →", v));
 *   count.set(1);   // fires subscriber
 *   count.get();    // 1
 *   unsub();        // unsubscribe
 */

/**
 * @template T
 * @typedef {{ get: () => T, set: (v: T) => void, update: (fn: (v: T) => T) => void, subscribe: (fn: (v: T, prev: T) => void) => (() => void) }} Observable
 */

/**
 * Create an observable wrapping an initial value.
 *
 * @template T
 * @param {T} initialValue
 * @returns {Observable<T>}
 */
export function observable(initialValue) {
  let _value = initialValue;
  /** @type {Set<(v: T, prev: T) => void>} */
  const _subscribers = new Set();

  return {
    /** Returns the current value. */
    get() {
      return _value;
    },

    /**
     * Set a new value and notify subscribers (only if value changed).
     * @param {T} newValue
     */
    set(newValue) {
      if (Object.is(_value, newValue)) return;
      const prev = _value;
      _value = newValue;
      for (const fn of _subscribers) fn(_value, prev);
    },

    /**
     * Update using a transform function.
     * @param {(v: T) => T} fn
     */
    update(fn) {
      this.set(fn(_value));
    },

    /**
     * Subscribe to value changes.
     * @param {(v: T, prev: T) => void} fn
     * @returns {() => void} unsubscribe
     */
    subscribe(fn) {
      _subscribers.add(fn);
      return () => _subscribers.delete(fn);
    },
  };
}

/**
 * Create a computed observable derived from one or more source observables.
 * Re-computes whenever any source changes.
 *
 * @template U
 * @param {Observable<unknown>[]} sources
 * @param {() => U} computeFn
 * @returns {Pick<Observable<U>, "get" | "subscribe">}
 */
export function computed(sources, computeFn) {
  let _value = computeFn();
  /** @type {Set<(v: U, prev: U) => void>} */
  const _subscribers = new Set();

  const recompute = () => {
    const prev = _value;
    const next = computeFn();
    if (!Object.is(prev, next)) {
      _value = next;
      for (const fn of _subscribers) fn(_value, prev);
    }
  };

  for (const src of sources) src.subscribe(recompute);

  return {
    get() { return _value; },
    subscribe(fn) {
      _subscribers.add(fn);
      return () => _subscribers.delete(fn);
    },
  };
}
