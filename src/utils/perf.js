/**
 * src/utils/perf.js — Performance utilities (Sprint 38)
 *
 * Provides pure, composable timing/throttle helpers with zero runtime deps.
 * Compatible with both browser and Node environments.
 *
 * Usage:
 *   import { debounce, throttle, memoize, measureAsync } from "../utils/perf.js";
 *
 *   const saveLazy   = debounce(save, 300);
 *   const scrollFast = throttle(onScroll, 100);
 *   const getStats   = memoize(computeStats);
 *   const { result, durationMs } = await measureAsync("sync", heavyFn);
 */

// ── debounce ───────────────────────────────────────────────────────────────

/**
 * Returns a debounced wrapper for `fn` that delays execution by `delay` ms
 * after the last call.
 *
 * The wrapper exposes:
 * - `.cancel()` — cancels any pending invocation
 * - `.flush()` — immediately invokes if pending
 *
 * @template {(...args: unknown[]) => unknown} F
 * @param {F} fn
 * @param {number} delay
 * @returns {F & { cancel(): void; flush(): void }}
 */
export function debounce(fn, delay) {
  let timer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
  let lastArgs = /** @type {unknown[]} */ ([]);

  function debounced(...args) {
    lastArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...lastArgs);
    }, delay);
  }

  debounced.cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      fn(...lastArgs);
    }
  };

  return /** @type {any} */ (debounced);
}

// ── throttle ───────────────────────────────────────────────────────────────

/**
 * Returns a throttled wrapper for `fn` that invokes at most once per `delay` ms.
 * Trailing invocations during the cooldown period are dropped.
 *
 * @template {(...args: unknown[]) => unknown} F
 * @param {F} fn
 * @param {number} delay
 * @returns {F & { cancel(): void }}
 */
export function throttle(fn, delay) {
  let lastAt = 0;
  let timer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);

  function throttled(...args) {
    const now = Date.now();
    const remaining = delay - (now - lastAt);
    if (remaining <= 0) {
      if (timer !== null) { clearTimeout(timer); timer = null; }
      lastAt = now;
      fn(...args);
    }
  }

  throttled.cancel = () => {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    lastAt = 0;
  };

  return /** @type {any} */ (throttled);
}

// ── memoize ────────────────────────────────────────────────────────────────

/**
 * Memoize a synchronous function.
 * The optional `keyFn` produces cache keys from the arguments; defaults to
 * `JSON.stringify(args)`.
 *
 * The wrapper exposes `.cache` (Map) and `.clear()`.
 *
 * @template {(...args: unknown[]) => unknown} F
 * @param {F} fn
 * @param {((...args: unknown[]) => string) | undefined} [keyFn]
 * @returns {F & { cache: Map<string, unknown>; clear(): void }}
 */
export function memoize(fn, keyFn) {
  const cache = new Map();
  const getKey = keyFn ?? ((...args) => JSON.stringify(args));

  function memoized(...args) {
    const k = getKey(...args);
    if (cache.has(k)) return cache.get(k);
    const result = fn(...args);
    cache.set(k, result);
    return result;
  }

  memoized.cache = cache;
  memoized.clear = () => cache.clear();

  return /** @type {any} */ (memoized);
}

// ── memoizeAsync ───────────────────────────────────────────────────────────

/**
 * Memoize an async function.  Resolved values are cached; rejected promises
 * are NOT cached — they are re-attempted on the next call.
 *
 * @template {(...args: unknown[]) => Promise<unknown>} F
 * @param {F} fn
 * @param {((...args: unknown[]) => string) | undefined} [keyFn]
 * @returns {F & { cache: Map<string, unknown>; clear(): void }}
 */
export function memoizeAsync(fn, keyFn) {
  const cache = new Map();
  const getKey = keyFn ?? ((...args) => JSON.stringify(args));

  function memoizedAsync(...args) {
    const k = getKey(...args);
    if (cache.has(k)) return Promise.resolve(cache.get(k));
    return fn(...args).then((result) => {
      cache.set(k, result);
      return result;
    });
  }

  memoizedAsync.cache = cache;
  memoizedAsync.clear = () => cache.clear();

  return /** @type {any} */ (memoizedAsync);
}

// ── measureAsync ───────────────────────────────────────────────────────────

/**
 * Time an async (or sync) operation and return its result alongside the
 * elapsed wall-clock duration.
 *
 * @template T
 * @param {string} label        Descriptive label (unused in logic; for callers to log)
 * @param {() => T | Promise<T>} fn
 * @returns {Promise<{ result: T, durationMs: number, label: string }>}
 */
export async function measureAsync(label, fn) {
  const start = Date.now();
  const result = await fn();
  const durationMs = Date.now() - start;
  return { result, durationMs, label };
}

// ── once ──────────────────────────────────────────────────────────────────

/**
 * Returns a wrapper that invokes `fn` at most once.
 * Subsequent calls return the cached result.
 *
 * @template {(...args: unknown[]) => unknown} F
 * @param {F} fn
 * @returns {F}
 */
export function once(fn) {
  let called = false;
  let cached = /** @type {unknown} */ (undefined);

  return /** @type {any} */ (function (...args) {
    if (!called) {
      called = true;
      cached = fn(...args);
    }
    return cached;
  });
}

// ── batch ─────────────────────────────────────────────────────────────────

/**
 * Accumulate multiple synchronous calls and flush them as a single batch
 * after the microtask queue drains.
 *
 * @template T
 * @param {(items: T[]) => void} flushFn   called once per microtask cycle
 * @returns {(item: T) => void}
 */
export function createBatcher(flushFn) {
  let pending = /** @type {T[]} */ ([]);
  let scheduled = false;

  return function push(item) {
    pending.push(item);
    if (!scheduled) {
      scheduled = true;
      Promise.resolve().then(() => {
        const batch = pending;
        pending = [];
        scheduled = false;
        flushFn(batch);
      });
    }
  };
}
