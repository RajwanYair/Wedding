/**
 * src/utils/subscription-manager.js — Scoped subscription lifecycle helper (Sprint 61)
 *
 * `SubscriptionManager` collects unsubscribe functions and calls them all
 * at once when `cleanup()` is invoked.  Designed to simplify section
 * `mount/unmount` patterns where several store or event subscriptions must
 * all be torn down together.
 *
 * Usage:
 *   const subs = new SubscriptionManager();
 *   subs.add(storeSubscribe("guests", renderGuests));
 *   subs.add(storeSubscribe("tables", renderTables));
 *   // later, on unmount:
 *   subs.cleanup();   // calls all unsubscribe functions and resets
 *
 * Alternatively, subscribe directly through the manager:
 *   subs.subscribe(storeSubscribe, "guests", renderGuests);
 */

export class SubscriptionManager {
  constructor() {
    /** @type {Set<() => void>} */
    this._unsubs = new Set();
  }

  /**
   * Register a cleanup function to be called on `cleanup()`.
   * @param {() => void} unsubFn  Unsubscribe/cleanup function returned by subscribe call.
   * @returns {this} (chainable)
   */
  add(unsubFn) {
    if (typeof unsubFn === "function") {
      this._unsubs.add(unsubFn);
    }
    return this;
  }

  /**
   * Call a subscribe function and automatically collect its returned unsubscribe function.
   * @template {unknown[]} A
   * @param {(...args: A) => (() => void)} subscribeFn  Subscribe function (e.g. storeSubscribe)
   * @param {...A} args  Arguments to pass to subscribeFn
   * @returns {this} (chainable)
   */
  subscribe(subscribeFn, ...args) {
    const unsub = subscribeFn(...args);
    return this.add(unsub);
  }

  /**
   * Call all registered cleanup functions and clear the set.
   */
  cleanup() {
    for (const fn of this._unsubs) {
      try {
        fn();
      } catch {
        // ignore individual errors to ensure all cleanup runs
      }
    }
    this._unsubs.clear();
  }

  /**
   * Number of pending cleanup functions.
   * @returns {number}
   */
  get size() {
    return this._unsubs.size;
  }

  /**
   * Whether there are no pending cleanup functions.
   * @returns {boolean}
   */
  get isEmpty() {
    return this._unsubs.size === 0;
  }
}

/**
 * Create a new SubscriptionManager.
 * @returns {SubscriptionManager}
 */
export function createSubscriptionManager() {
  return new SubscriptionManager();
}
