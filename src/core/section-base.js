/**
 * src/core/section-base.js — Optional BaseSection class for lifecycle uniformity
 *
 * ROADMAP §5 Phase B — sections currently re-implement mount/unmount and
 * each manages its own subscription cleanup. This class is opt-in and provides
 * a uniform pattern; existing function-style sections continue to work unchanged.
 *
 * Adapter helper `fromSection(instance)` returns `{ mount, unmount, capabilities }`
 * matching the section-contract so the class plugs into nav.js with no changes.
 *
 * @example
 *   class GuestsSection extends BaseSection {
 *     async onMount() {
 *       this.subscribe("guests", () => this.render());
 *       this.addCleanup(() => clearInterval(this._timer));
 *     }
 *     onUnmount() { ... }
 *   }
 *   const guestsSection = new GuestsSection("guests");
 *   export const { mount, unmount, capabilities } = fromSection(guestsSection);
 */

import { storeSubscribeScoped, cleanupScope } from "./store.js";

/**
 * @typedef {() => void} CleanupFn
 */

/**
 * Base class for sections. Provides lifecycle hooks (mount/unmount),
 * subscription tracking, and cleanup helpers shared by all sections.
 */
export class BaseSection {
  /** @type {string} */
  #name;
  /** @type {Array<() => void>} */
  #unsubscribers = [];
  /** @type {Array<CleanupFn>} */
  #cleanup = [];
  /** @type {boolean} */
  #mounted = false;

  /**
   * @param {string} name  Section name (must match nav route).
   * @param {Record<string, boolean>} [capabilities]
   */
  constructor(name, capabilities = {}) {
    if (!name || typeof name !== "string") {
      throw new TypeError("BaseSection: name is required");
    }
    this.#name = name;
    /** @type {Readonly<Record<string, boolean>>} */
    this.capabilities = Object.freeze({ ...capabilities });
  }

  /** @returns {string} */
  get name() {
    return this.#name;
  }

  /** @returns {boolean} */
  get isMounted() {
    return this.#mounted;
  }

  // ── Subclass hooks (override these) ────────────────────────────────────

  /**
   * Called once on mount. Override to fetch data, render, attach listeners.
   * @param {Record<string, unknown>} [_params]
   * @returns {Promise<void>}
   */

  async onMount(_params) {
    /* override */
  }

  /**
   * Called once on unmount. Override for any custom teardown beyond cleanup
   * functions registered with `addCleanup()`. Subscriptions registered via
   * `subscribe()` are released automatically.
   * @returns {void}
   */
  onUnmount() {
    /* override */
  }

  // ── Helpers available to subclasses ────────────────────────────────────

  /**
   * Subscribe to a store key. The subscription is released automatically on
   * unmount.
   * @param {string} key
   * @param {(value: unknown) => void} fn
   * @returns {() => void}  Manual unsubscriber (already auto-released on unmount).
   */
  subscribe(key, fn) {
    const unsub = storeSubscribeScoped(key, fn, this.#name);
    this.#unsubscribers.push(unsub);
    return unsub;
  }

  /**
   * Register a cleanup function called once on unmount.
   * @param {CleanupFn} fn
   */
  addCleanup(fn) {
    if (typeof fn === "function") this.#cleanup.push(fn);
  }

  // ── Lifecycle (called by adapter — do not override) ────────────────────

  /**
   * Called when `onMount()` throws an unhandled error. Shows a toast and
   * reports to observability. Override to customise error handling.
   * @param {unknown} err
   * @returns {Promise<void>}
   */
  async _onError(err) {
    try {
      const [{ showToast }, { captureException }] = await Promise.all([
        import("./ui.js"),
        import("../services/observability.js"),
      ]);
      captureException(err, { section: this.#name });
      showToast(`שגיאה בטעינת ${this.#name}`, "error");
    } catch {
      /* observability unavailable — fail silently */
    }
  }

  /**
   * Internal: call from `fromSection()` adapter only.
   * @param {Record<string, unknown>} [params]
   * @returns {Promise<void>}
   */
  async _mount(params) {
    if (this.#mounted) return;
    this.#mounted = true;
    try {
      await this.onMount(params);
    } catch (err) {
      this.#mounted = false;
      await this._onError(err);
    }
  }

  /**
   * Internal: call from `fromSection()` adapter only.
   */
  _unmount() {
    if (!this.#mounted) return;
    this.#mounted = false;
    cleanupScope(this.#name);
    this.#unsubscribers.length = 0;
    for (const fn of this.#cleanup) {
      try {
        fn();
      } catch {
        /* ignore */
      }
    }
    this.#cleanup.length = 0;
    try {
      this.onUnmount();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Adapter: turn a BaseSection instance into a section-contract module shape.
 * Use as the named-export destructuring source in section files.
 *
 * @param {BaseSection} instance
 * @returns {{ mount: (p?: Record<string, unknown>) => Promise<void>, unmount: () => void, capabilities: Record<string, boolean> }}
 */
export function fromSection(instance) {
  if (!(instance instanceof BaseSection)) {
    throw new TypeError("fromSection: expected a BaseSection instance");
  }
  return {
    mount: (p) => instance._mount(p),
    unmount: () => instance._unmount(),
    capabilities: instance.capabilities,
  };
}
