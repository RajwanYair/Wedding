/**
 * src/core/signals.js — Signal-shaped facade over the existing store (S101).
 *
 * Roadmap §11.4 plans to swap store internals to Preact Signals (~3 KB) with
 * a public-API-compatible shim. This module is the *target* shape exposed
 * today, backed by the current store. v15 will reimplement the same API on
 * top of `@preact/signals-core` without callsite changes.
 *
 * No runtime dependency added: the abstraction stays pure ESM.
 *
 * @example
 *   const guests = signal("guests");
 *   guests.subscribe((v) => console.log(v));
 *   guests.value = nextValue;          // notifies subscribers
 *   const total = computed(() => guests.value.length);
 */

import { storeGet, storeSet, storeSubscribe } from "./store.js";

/**
 * @template T
 * @typedef {{
 *   readonly key: string,
 *   value: T,
 *   peek(): T,
 *   subscribe(fn: (value: T) => void): () => void,
 * }} Signal
 */

/**
 * Wrap a store key as a `Signal`-shaped object. The `value` accessor reads
 * the current value via `storeGet` and writes via `storeSet`.
 *
 * @template T
 * @param {string} key
 * @returns {Signal<T>}
 */
export function signal(key) {
  return Object.freeze({
    get key() {
      return key;
    },
    get value() {
      return /** @type {T} */ (storeGet(key));
    },
    set value(next) {
      storeSet(key, /** @type {unknown} */ (next));
    },
    peek() {
      return /** @type {T} */ (storeGet(key));
    },
    subscribe(fn) {
      // First call is fire-on-read — emit initial value to mimic Preact Signal API.
      try {
        fn(/** @type {T} */ (storeGet(key)));
      } catch {
        /* ignore subscriber error */
      }
      return storeSubscribe(key, /** @type {Function} */ (fn));
    },
  });
}

/**
 * Lightweight `computed` shim. Recomputes the projection lazily on each
 * `value` read; subscribers are notified when any of the source signals fires.
 *
 * @template T
 * @param {() => T} project    Pure projection function
 * @param {Signal<unknown>[]} sources  Source signals to listen on
 * @returns {Signal<T>}
 */
export function computed(project, sources) {
  /** @type {Set<(v: T) => void>} */
  const subs = new Set();
  const fireAll = () => {
    const v = project();
    for (const fn of subs) {
      try {
        fn(v);
      } catch {
        /* ignore */
      }
    }
  };
  const teardown = sources.map((s) => s.subscribe(() => fireAll()));
  return Object.freeze({
    get key() {
      return "(computed)";
    },
    get value() {
      return project();
    },
    set value(_next) {
      throw new Error("computed signals are read-only");
    },
    peek() {
      return project();
    },
    subscribe(fn) {
      subs.add(/** @type {(v: T) => void} */ (fn));
      try {
        fn(project());
      } catch {
        /* ignore */
      }
      return () => {
        subs.delete(/** @type {(v: T) => void} */ (fn));
        if (subs.size === 0) {
          for (const t of teardown) {
            try {
              t();
            } catch {
              /* ignore */
            }
          }
        }
      };
    },
  });
}
